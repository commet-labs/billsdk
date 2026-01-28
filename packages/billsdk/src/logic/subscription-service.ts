import type {
  BillingInterval,
  Payment,
  Plan,
  Subscription,
} from "@billsdk/core";
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

  if (!ctx.paymentAdapter) {
    throw new Error("Payment adapter not configured");
  }

  const customer =
    await ctx.internalAdapter.findCustomerByExternalId(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  const plan = ctx.internalAdapter.findPlanByCode(planCode);
  if (!plan) {
    throw new Error("Plan not found");
  }

  const price = ctx.internalAdapter.getPlanPrice(planCode, interval);
  if (!price) {
    throw new Error(
      `No price found for plan ${planCode} with interval ${interval}`,
    );
  }

  const subscription = await ctx.internalAdapter.createSubscription({
    customerId: customer.id,
    planCode,
    interval,
    status: "pending_payment",
    trialDays: price.trialDays,
  });

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

  if (result.status === "active") {
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

    const activeSubscription = await ctx.internalAdapter.updateSubscription(
      subscription.id,
      { status: "active" },
    );

    if (result.providerCustomerId && !customer.providerCustomerId) {
      await ctx.internalAdapter.updateCustomer(customer.id, {
        providerCustomerId: result.providerCustomerId,
      });
    }

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
    await ctx.internalAdapter.updateSubscription(subscription.id, {
      providerCheckoutSessionId: result.sessionId,
    });

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

export async function cancelSubscription(
  ctx: BillingContext,
  params: CancelSubscriptionParams,
): Promise<CancelSubscriptionResult> {
  const { customerId, cancelAt = "period_end" } = params;

  const customer =
    await ctx.internalAdapter.findCustomerByExternalId(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  const subscription = await ctx.internalAdapter.findSubscriptionByCustomerId(
    customer.id,
  );
  if (!subscription) {
    throw new Error("No active subscription found");
  }

  if (cancelAt === "immediately") {
    const canceled = await ctx.internalAdapter.cancelSubscription(
      subscription.id,
    );
    return { subscription: canceled, canceledImmediately: true };
  }

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
  newInterval?: BillingInterval;
  prorate?: boolean;
}

export interface ChangeSubscriptionResult {
  subscription: Subscription | null;
  previousPlan: Plan | null;
  newPlan: Plan;
  payment: Payment | null;
  scheduled: boolean;
  effectiveAt?: Date;
}

const intervalRank: Record<BillingInterval, number> = {
  monthly: 1,
  quarterly: 2,
  yearly: 3,
};

function isUpgrade(
  oldPrice: number,
  newPrice: number,
  oldInterval: BillingInterval,
  newInterval: BillingInterval,
): boolean {
  if (oldInterval !== newInterval) {
    return intervalRank[newInterval] > intervalRank[oldInterval];
  }
  return newPrice > oldPrice;
}

export async function changeSubscription(
  ctx: BillingContext,
  params: ChangeSubscriptionParams,
): Promise<ChangeSubscriptionResult> {
  const { customerId, newPlanCode, newInterval, prorate = true } = params;

  const customer =
    await ctx.internalAdapter.findCustomerByExternalId(customerId);
  if (!customer) {
    throw new Error("Customer not found");
  }

  const subscription = await ctx.internalAdapter.findSubscriptionByCustomerId(
    customer.id,
  );
  if (!subscription) {
    throw new Error("No active subscription found");
  }

  const targetInterval = newInterval ?? subscription.interval;

  if (
    subscription.planCode === newPlanCode &&
    subscription.interval === targetInterval
  ) {
    throw new Error("Already on this plan");
  }

  const oldPlan = ctx.internalAdapter.findPlanByCode(subscription.planCode);
  const oldPrice = ctx.internalAdapter.getPlanPrice(
    subscription.planCode,
    subscription.interval,
  );
  if (!oldPrice) {
    throw new Error("Current plan price not found");
  }

  const newPlan = ctx.internalAdapter.findPlanByCode(newPlanCode);
  if (!newPlan) {
    throw new Error("New plan not found");
  }

  const newPrice = ctx.internalAdapter.getPlanPrice(
    newPlanCode,
    targetInterval,
  );
  if (!newPrice) {
    throw new Error(
      `No price found for plan ${newPlanCode} with interval ${targetInterval}`,
    );
  }

  const upgrade = isUpgrade(
    oldPrice.amount,
    newPrice.amount,
    subscription.interval,
    targetInterval,
  );

  ctx.logger.info("Plan change detected", {
    from: `${subscription.planCode} (${subscription.interval})`,
    to: `${newPlanCode} (${targetInterval})`,
    oldAmount: oldPrice.amount,
    newAmount: newPrice.amount,
    isUpgrade: upgrade,
  });

  // Downgrade: schedule for period end
  if (!upgrade) {
    ctx.logger.info("Downgrade scheduled for period end", {
      scheduledPlanCode: newPlanCode,
      scheduledInterval: targetInterval,
      effectiveAt: subscription.currentPeriodEnd,
    });

    const updatedSubscription = await ctx.internalAdapter.updateSubscription(
      subscription.id,
      {
        scheduledPlanCode: newPlanCode,
        scheduledInterval: targetInterval,
      },
    );

    return {
      subscription: updatedSubscription,
      previousPlan: oldPlan,
      newPlan,
      payment: null,
      scheduled: true,
      effectiveAt: subscription.currentPeriodEnd,
    };
  }

  // Upgrade: immediate change with proration and period reset
  let payment: Payment | null = null;
  const changeDate = ctx.timeProvider.now();

  if (prorate) {
    const prorationResult = calculateProration({
      oldPlanAmount: oldPrice.amount,
      newPlanAmount: newPrice.amount,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      changeDate,
    });

    ctx.logger.info("Proration calculated", {
      credit: prorationResult.credit,
      charge: prorationResult.charge,
      netAmount: prorationResult.netAmount,
      daysUsed: prorationResult.daysUsed,
    });

    if (prorationResult.netAmount > 0) {
      if (!ctx.paymentAdapter?.charge) {
        throw new Error(
          "Payment adapter does not support direct charging. Cannot process upgrade.",
        );
      }

      if (!customer.providerCustomerId) {
        throw new Error(
          "Customer does not have a saved payment method. Cannot process upgrade.",
        );
      }

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
  }

  // Calculate new period end based on interval
  const newPeriodStart = changeDate;
  const newPeriodEnd = new Date(changeDate);
  if (targetInterval === "yearly") {
    newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
  } else if (targetInterval === "quarterly") {
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 3);
  } else {
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
  }

  const updatedSubscription = await ctx.internalAdapter.updateSubscription(
    subscription.id,
    {
      planCode: newPlanCode,
      interval: targetInterval,
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
      scheduledPlanCode: undefined,
      scheduledInterval: undefined,
    },
  );

  ctx.logger.info("Period reset", {
    from: `${subscription.currentPeriodStart.toISOString()} - ${subscription.currentPeriodEnd.toISOString()}`,
    to: `${newPeriodStart.toISOString()} - ${newPeriodEnd.toISOString()}`,
  });

  return {
    subscription: updatedSubscription,
    previousPlan: oldPlan,
    newPlan,
    payment,
    scheduled: false,
  };
}
