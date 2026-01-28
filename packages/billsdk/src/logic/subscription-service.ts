import type { Payment, Plan, Subscription } from "@billsdk/core";
import type { BillingContext } from "../context/create-context";
import { calculateProration } from "./proration";

export interface CreateSubscriptionParams {
  customerId: string;
  planCode: string;
  interval?: "monthly" | "yearly";
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateSubscriptionResult {
  subscription: Subscription;
  redirectUrl?: string;
}

/**
 * Create a new subscription for a customer.
 *
 * This is the single source of truth for subscription creation logic.
 * Both HTTP endpoints and direct API methods should use this function.
 */
export async function createSubscription(
  ctx: BillingContext,
  params: CreateSubscriptionParams,
): Promise<CreateSubscriptionResult> {
  const {
    customerId,
    planCode,
    interval = "monthly",
    successUrl,
    cancelUrl,
  } = params;

  // Check if payment adapter is configured
  if (!ctx.paymentAdapter) {
    throw new Error("Payment adapter not configured");
  }

  // Find customer by external ID
  const customer =
    await ctx.internalAdapter.findCustomerByExternalId(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  // Find plan from config (synchronous)
  const plan = ctx.internalAdapter.findPlanByCode(planCode);
  if (!plan) {
    throw new Error("Plan not found");
  }

  // Find price for interval (synchronous)
  const price = ctx.internalAdapter.getPlanPrice(planCode, interval);
  if (!price) {
    throw new Error(
      `No price found for plan ${planCode} with interval ${interval}`,
    );
  }

  // Create subscription in pending state
  const subscription = await ctx.internalAdapter.createSubscription({
    customerId: customer.id,
    planCode,
    interval,
    status: "pending_payment",
    trialDays: price.trialDays,
  });

  // Process payment - adapter decides the flow
  const result = await ctx.paymentAdapter.processPayment({
    customer: {
      id: customer.id,
      email: customer.email,
      providerCustomerId: customer.providerCustomerId,
    },
    plan: {
      code: plan.code,
      name: plan.name,
    },
    price: {
      amount: price.amount,
      currency: price.currency,
      interval: price.interval,
    },
    subscription: {
      id: subscription.id,
    },
    successUrl,
    cancelUrl,
    metadata: {
      subscriptionId: subscription.id,
      customerId: customer.id,
    },
  });

  // Handle payment result based on adapter's decision
  if (result.status === "active") {
    // Cancel any other active subscriptions for this customer
    const existingSubscriptions = await ctx.internalAdapter.listSubscriptions(
      customer.id,
    );
    for (const existing of existingSubscriptions) {
      if (
        existing.id !== subscription.id &&
        (existing.status === "active" || existing.status === "trialing")
      ) {
        await ctx.internalAdapter.cancelSubscription(existing.id);
      }
    }

    // Payment completed immediately - activate subscription
    const activeSubscription = await ctx.internalAdapter.updateSubscription(
      subscription.id,
      { status: "active" },
    );

    // Update customer with provider ID if returned
    if (result.providerCustomerId && !customer.providerCustomerId) {
      await ctx.internalAdapter.updateCustomer(customer.id, {
        providerCustomerId: result.providerCustomerId,
      });
    }

    // Record the payment (only if amount > 0)
    if (price.amount > 0) {
      await ctx.internalAdapter.createPayment({
        customerId: customer.id,
        subscriptionId: subscription.id,
        type: "subscription",
        status: "succeeded",
        amount: price.amount,
        currency: price.currency,
        metadata: {
          planCode: plan.code,
          interval,
        },
      });
    }

    return {
      subscription: activeSubscription ?? {
        ...subscription,
        status: "active" as const,
      },
    };
  }

  if (result.status === "pending") {
    // Payment pending - user needs to complete payment flow
    await ctx.internalAdapter.updateSubscription(subscription.id, {
      providerCheckoutSessionId: result.sessionId,
    });

    // Update customer with provider ID if returned
    if (result.providerCustomerId && !customer.providerCustomerId) {
      await ctx.internalAdapter.updateCustomer(customer.id, {
        providerCustomerId: result.providerCustomerId,
      });
    }

    return {
      subscription,
      redirectUrl: result.redirectUrl,
    };
  }

  // result.status === "failed"
  // Mark the subscription as canceled since payment failed
  await ctx.internalAdapter.updateSubscription(subscription.id, {
    status: "canceled",
  });
  throw new Error(result.error);
}

export interface CancelSubscriptionParams {
  customerId: string;
  cancelAt?: "period_end" | "immediately";
}

export interface CancelSubscriptionResult {
  subscription: Subscription | null;
  canceledImmediately: boolean;
  accessUntil?: Date;
}

/**
 * Cancel an existing subscription.
 *
 * This is the single source of truth for subscription cancellation logic.
 * Both HTTP endpoints and direct API methods should use this function.
 */
export async function cancelSubscription(
  ctx: BillingContext,
  params: CancelSubscriptionParams,
): Promise<CancelSubscriptionResult> {
  const { customerId, cancelAt = "period_end" } = params;

  // Find customer by external ID
  const customer =
    await ctx.internalAdapter.findCustomerByExternalId(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  // Find active subscription
  const subscription = await ctx.internalAdapter.findSubscriptionByCustomerId(
    customer.id,
  );
  if (!subscription) {
    throw new Error("No active subscription found");
  }

  // Cancel subscription
  if (cancelAt === "immediately") {
    const canceled = await ctx.internalAdapter.cancelSubscription(
      subscription.id,
    );
    return { subscription: canceled, canceledImmediately: true };
  }

  // Cancel at period end
  const canceled = await ctx.internalAdapter.cancelSubscription(
    subscription.id,
    subscription.currentPeriodEnd,
  );
  return {
    subscription: canceled,
    canceledImmediately: false,
    accessUntil: subscription.currentPeriodEnd,
  };
}

export interface ChangeSubscriptionParams {
  customerId: string;
  newPlanCode: string;
  prorate?: boolean;
}

export interface ChangeSubscriptionResult {
  subscription: Subscription | null;
  previousPlan: Plan | null;
  newPlan: Plan;
  payment: Payment | null;
}

/**
 * Change a subscription to a different plan.
 *
 * This is the single source of truth for subscription change logic.
 * Both HTTP endpoints and direct API methods should use this function.
 */
export async function changeSubscription(
  ctx: BillingContext,
  params: ChangeSubscriptionParams,
): Promise<ChangeSubscriptionResult> {
  const { customerId, newPlanCode, prorate = true } = params;

  // Find customer by external ID
  const customer =
    await ctx.internalAdapter.findCustomerByExternalId(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  // Find active subscription
  const subscription = await ctx.internalAdapter.findSubscriptionByCustomerId(
    customer.id,
  );
  if (!subscription) {
    throw new Error("No active subscription found");
  }

  // Check if already on the same plan
  if (subscription.planCode === newPlanCode) {
    throw new Error("Already on this plan");
  }

  // Get current plan and price
  const oldPlan = ctx.internalAdapter.findPlanByCode(subscription.planCode);
  const oldPrice = ctx.internalAdapter.getPlanPrice(
    subscription.planCode,
    subscription.interval,
  );
  if (!oldPrice) {
    throw new Error("Current plan price not found");
  }

  // Get new plan and price
  const newPlan = ctx.internalAdapter.findPlanByCode(newPlanCode);
  if (!newPlan) {
    throw new Error("New plan not found");
  }

  const newPrice = ctx.internalAdapter.getPlanPrice(
    newPlanCode,
    subscription.interval,
  );
  if (!newPrice) {
    throw new Error(
      `No price found for plan ${newPlanCode} with interval ${subscription.interval}`,
    );
  }

  let payment: Payment | null = null;

  // Calculate and process proration if enabled
  if (prorate) {
    const prorationResult = calculateProration({
      oldPlanAmount: oldPrice.amount,
      newPlanAmount: newPrice.amount,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      changeDate: new Date(),
    });

    ctx.logger.info("Proration calculated", {
      credit: prorationResult.credit,
      charge: prorationResult.charge,
      netAmount: prorationResult.netAmount,
      daysRemaining: prorationResult.daysRemaining,
    });

    // If there's a positive net amount, charge the customer
    if (prorationResult.netAmount > 0) {
      // Check if adapter supports direct charging
      if (!ctx.paymentAdapter?.charge) {
        throw new Error(
          "Payment adapter does not support direct charging. Cannot process upgrade.",
        );
      }

      // Customer must have a saved payment method
      if (!customer.providerCustomerId) {
        throw new Error(
          "Customer does not have a saved payment method. Cannot process upgrade.",
        );
      }

      // Charge the difference
      const chargeResult = await ctx.paymentAdapter.charge({
        customer: {
          id: customer.id,
          email: customer.email,
          providerCustomerId: customer.providerCustomerId,
        },
        amount: prorationResult.netAmount,
        currency: newPrice.currency,
        description: `Upgrade from ${oldPlan?.name ?? subscription.planCode} to ${newPlan.name}`,
        metadata: {
          subscriptionId: subscription.id,
          customerId: customer.id,
          type: "upgrade",
          oldPlanCode: subscription.planCode,
          newPlanCode,
        },
      });

      if (chargeResult.status === "failed") {
        throw new Error(chargeResult.error ?? "Charge failed");
      }

      // Record the payment
      payment = await ctx.internalAdapter.createPayment({
        customerId: customer.id,
        subscriptionId: subscription.id,
        type: "upgrade",
        status: "succeeded",
        amount: prorationResult.netAmount,
        currency: newPrice.currency,
        providerPaymentId: chargeResult.providerPaymentId,
        metadata: {
          oldPlanCode: subscription.planCode,
          newPlanCode,
          proration: {
            credit: prorationResult.credit,
            charge: prorationResult.charge,
          },
        },
      });
    }
    // If netAmount is negative (downgrade), we could issue a credit
    // For now, we just update the plan without refunding
  }

  // Update subscription with new plan
  const updatedSubscription = await ctx.internalAdapter.updateSubscription(
    subscription.id,
    { planCode: newPlanCode },
  );

  return {
    subscription: updatedSubscription,
    previousPlan: oldPlan,
    newPlan,
    payment,
  };
}
