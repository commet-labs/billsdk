import type { Subscription, Where } from "@billsdk/core";
import type { BillingContext } from "../context/create-context";
import { TABLES } from "../db/schema";

/**
 * Parameters for processing renewals
 */
export interface ProcessRenewalsParams {
  /**
   * Process only a specific customer (useful for testing)
   */
  customerId?: string;

  /**
   * Dry run - don't actually charge, just report what would happen
   */
  dryRun?: boolean;

  /**
   * Maximum number of subscriptions to process (for batching)
   */
  limit?: number;
}

/**
 * Individual renewal result
 */
export interface RenewalDetail {
  subscriptionId: string;
  customerId: string;
  status: "succeeded" | "failed" | "skipped";
  amount?: number;
  error?: string;
  /**
   * If a scheduled plan change was applied
   */
  planChanged?: {
    from: string;
    to: string;
  };
}

/**
 * Result of processing renewals
 */
export interface ProcessRenewalsResult {
  /**
   * Total subscriptions processed
   */
  processed: number;

  /**
   * Successful renewals
   */
  succeeded: number;

  /**
   * Failed renewals
   */
  failed: number;

  /**
   * Skipped (already renewed, etc.)
   */
  skipped: number;

  /**
   * Details for each renewal
   */
  renewals: RenewalDetail[];
}

/**
 * Calculate new period end based on interval
 */
function calculateNewPeriodEnd(
  from: Date,
  interval: "monthly" | "quarterly" | "yearly",
): Date {
  const newEnd = new Date(from);
  if (interval === "yearly") {
    newEnd.setFullYear(newEnd.getFullYear() + 1);
  } else if (interval === "quarterly") {
    newEnd.setMonth(newEnd.getMonth() + 3);
  } else {
    newEnd.setMonth(newEnd.getMonth() + 1);
  }
  return newEnd;
}

/**
 * Find subscriptions that are due for renewal
 */
async function findDueSubscriptions(
  ctx: BillingContext,
  params: ProcessRenewalsParams,
): Promise<Subscription[]> {
  const now = params.customerId
    ? await ctx.timeProvider.now(params.customerId)
    : new Date();

  // Build where clause
  const where: Where[] = [
    // Only active or past_due subscriptions
    {
      field: "status",
      operator: "in",
      value: ["active", "past_due"],
    },
    // Period has ended
    {
      field: "currentPeriodEnd",
      operator: "lte",
      value: now,
    },
  ];

  // If specific customer, filter by customer
  if (params.customerId) {
    // Need to find the internal customer ID first
    const customer = await ctx.internalAdapter.findCustomerByExternalId(
      params.customerId,
    );
    if (!customer) {
      return [];
    }
    where.push({
      field: "customerId",
      operator: "eq",
      value: customer.id,
    });
  }

  return ctx.adapter.findMany<Subscription>({
    model: TABLES.SUBSCRIPTION,
    where,
    limit: params.limit,
    sortBy: { field: "currentPeriodEnd", direction: "asc" },
  });
}

/**
 * Apply scheduled plan changes (downgrades)
 * Returns the new plan code if changed, null if no change
 */
async function applyScheduledChanges(
  ctx: BillingContext,
  subscription: Subscription,
): Promise<{ planChanged: boolean; newPlanCode: string; newInterval: string }> {
  if (!subscription.scheduledPlanCode) {
    return {
      planChanged: false,
      newPlanCode: subscription.planCode,
      newInterval: subscription.interval,
    };
  }

  const newPlanCode = subscription.scheduledPlanCode;
  const newInterval = subscription.scheduledInterval ?? subscription.interval;

  ctx.logger.info("Applying scheduled plan change", {
    subscriptionId: subscription.id,
    from: subscription.planCode,
    to: newPlanCode,
    newInterval,
  });

  await ctx.internalAdapter.updateSubscription(subscription.id, {
    planCode: newPlanCode,
    interval: newInterval,
    scheduledPlanCode: undefined,
    scheduledInterval: undefined,
  });

  return {
    planChanged: true,
    newPlanCode,
    newInterval,
  };
}

/**
 * Process a single subscription renewal
 */
async function processSubscriptionRenewal(
  ctx: BillingContext,
  subscription: Subscription,
  dryRun: boolean,
): Promise<RenewalDetail> {
  const customer = await ctx.internalAdapter.findCustomerById(
    subscription.customerId,
  );
  if (!customer) {
    return {
      subscriptionId: subscription.id,
      customerId: subscription.customerId,
      status: "failed",
      error: "Customer not found",
    };
  }

  // Apply any scheduled plan changes first
  const {
    planChanged,
    newPlanCode,
    newInterval: newIntervalStr,
  } = await applyScheduledChanges(ctx, subscription);
  const newInterval = newIntervalStr as "monthly" | "quarterly" | "yearly";

  // Get the price for the (possibly new) plan
  const price = ctx.internalAdapter.getPlanPrice(newPlanCode, newInterval);
  if (!price) {
    return {
      subscriptionId: subscription.id,
      customerId: customer.externalId,
      status: "failed",
      error: `No price found for plan ${newPlanCode} with interval ${newInterval}`,
      planChanged: planChanged
        ? { from: subscription.planCode, to: newPlanCode }
        : undefined,
    };
  }

  const amount = price.amount;
  const now = await ctx.timeProvider.now(customer.externalId);

  // If dry run, don't actually charge
  if (dryRun) {
    return {
      subscriptionId: subscription.id,
      customerId: customer.externalId,
      status: "succeeded",
      amount,
      planChanged: planChanged
        ? { from: subscription.planCode, to: newPlanCode }
        : undefined,
    };
  }

  // Free plan - just update the period
  if (amount === 0) {
    const newPeriodEnd = calculateNewPeriodEnd(now, newInterval);

    await ctx.internalAdapter.updateSubscription(subscription.id, {
      currentPeriodStart: now,
      currentPeriodEnd: newPeriodEnd,
      status: "active",
    });

    ctx.logger.info("Free renewal processed", {
      subscriptionId: subscription.id,
      newPeriodEnd: newPeriodEnd.toISOString(),
    });

    return {
      subscriptionId: subscription.id,
      customerId: customer.externalId,
      status: "succeeded",
      amount: 0,
      planChanged: planChanged
        ? { from: subscription.planCode, to: newPlanCode }
        : undefined,
    };
  }

  // Check if customer has a payment method
  if (!customer.providerCustomerId) {
    ctx.logger.warn("Customer has no payment method, marking as past_due", {
      subscriptionId: subscription.id,
      customerId: customer.externalId,
    });

    await ctx.internalAdapter.updateSubscription(subscription.id, {
      status: "past_due",
    });

    return {
      subscriptionId: subscription.id,
      customerId: customer.externalId,
      status: "failed",
      error: "No payment method on file",
      planChanged: planChanged
        ? { from: subscription.planCode, to: newPlanCode }
        : undefined,
    };
  }

  // Check if payment adapter supports charging
  if (!ctx.paymentAdapter?.charge) {
    ctx.logger.error("Payment adapter does not support direct charging", {
      subscriptionId: subscription.id,
    });

    return {
      subscriptionId: subscription.id,
      customerId: customer.externalId,
      status: "failed",
      error: "Payment adapter does not support direct charging",
      planChanged: planChanged
        ? { from: subscription.planCode, to: newPlanCode }
        : undefined,
    };
  }

  // Charge the customer
  const plan = ctx.internalAdapter.findPlanByCode(newPlanCode);
  const chargeResult = await ctx.paymentAdapter.charge({
    customer: {
      id: customer.id,
      email: customer.email,
      providerCustomerId: customer.providerCustomerId,
    },
    amount,
    currency: price.currency,
    description: `Renewal: ${plan?.name ?? newPlanCode} (${newInterval})`,
    metadata: {
      subscriptionId: subscription.id,
      customerId: customer.id,
      type: "renewal",
      planCode: newPlanCode,
    },
  });

  if (chargeResult.status === "failed") {
    ctx.logger.warn("Renewal charge failed", {
      subscriptionId: subscription.id,
      error: chargeResult.error,
    });

    // Mark as past_due for retry on next cron run
    await ctx.internalAdapter.updateSubscription(subscription.id, {
      status: "past_due",
    });

    return {
      subscriptionId: subscription.id,
      customerId: customer.externalId,
      status: "failed",
      error: chargeResult.error ?? "Charge failed",
      planChanged: planChanged
        ? { from: subscription.planCode, to: newPlanCode }
        : undefined,
    };
  }

  // Charge succeeded - update subscription and create payment record
  const newPeriodEnd = calculateNewPeriodEnd(now, newInterval);

  await ctx.internalAdapter.updateSubscription(subscription.id, {
    currentPeriodStart: now,
    currentPeriodEnd: newPeriodEnd,
    status: "active",
  });

  await ctx.internalAdapter.createPayment({
    customerId: customer.id,
    subscriptionId: subscription.id,
    type: "renewal",
    status: "succeeded",
    amount,
    currency: price.currency,
    providerPaymentId: chargeResult.providerPaymentId,
    metadata: {
      planCode: newPlanCode,
      interval: newInterval,
    },
  });

  ctx.logger.info("Renewal succeeded", {
    subscriptionId: subscription.id,
    amount,
    newPeriodEnd: newPeriodEnd.toISOString(),
  });

  return {
    subscriptionId: subscription.id,
    customerId: customer.externalId,
    status: "succeeded",
    amount,
    planChanged: planChanged
      ? { from: subscription.planCode, to: newPlanCode }
      : undefined,
  };
}

/**
 * Process all due renewals
 *
 * This function:
 * 1. Finds all subscriptions where currentPeriodEnd <= now
 * 2. Applies any scheduled plan changes (downgrades)
 * 3. Charges the customer for the new period
 * 4. Updates the subscription period dates
 * 5. Creates payment records
 *
 * Idempotent: Running twice won't double-charge because the period dates are updated.
 */
export async function processRenewals(
  ctx: BillingContext,
  params: ProcessRenewalsParams = {},
): Promise<ProcessRenewalsResult> {
  const { dryRun = false } = params;

  ctx.logger.info("Starting renewal processing", {
    dryRun,
    customerId: params.customerId,
    limit: params.limit,
  });

  // Find due subscriptions
  const dueSubscriptions = await findDueSubscriptions(ctx, params);

  ctx.logger.info(
    `Found ${dueSubscriptions.length} subscriptions due for renewal`,
  );

  const result: ProcessRenewalsResult = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    renewals: [],
  };

  // Process each subscription
  for (const subscription of dueSubscriptions) {
    result.processed++;

    try {
      const renewalResult = await processSubscriptionRenewal(
        ctx,
        subscription,
        dryRun,
      );

      result.renewals.push(renewalResult);

      if (renewalResult.status === "succeeded") {
        result.succeeded++;
      } else if (renewalResult.status === "failed") {
        result.failed++;
      } else {
        result.skipped++;
      }
    } catch (error) {
      ctx.logger.error("Error processing renewal", {
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : String(error),
      });

      result.failed++;
      result.renewals.push({
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  ctx.logger.info("Renewal processing complete", {
    processed: result.processed,
    succeeded: result.succeeded,
    failed: result.failed,
    skipped: result.skipped,
  });

  return result;
}
