import type { Subscription } from "@billsdk/core";
import type { BillingContext } from "../context/create-context";

export interface HandleTrialEndParams {
  /**
   * Subscription ID whose trial is ending
   */
  subscriptionId: string;
}

export interface HandleTrialEndResult {
  /**
   * The subscription after trial processing
   */
  subscription: Subscription;
  /**
   * Whether the subscription was converted to paid (true) or canceled (false)
   */
  converted: boolean;
}

/**
 * Handle the end of a trial period for a subscription.
 *
 * This is the single source of truth for trial end logic.
 * The default behavior:
 * - If customer has a payment method and amount > 0: charge first period, activate
 * - If customer has a payment method and amount === 0: activate (free plan with trial)
 * - If charge fails: mark as past_due
 * - If no payment method: cancel the subscription
 */
export async function handleTrialEnd(
  ctx: BillingContext,
  params: HandleTrialEndParams,
): Promise<HandleTrialEndResult> {
  const { subscriptionId } = params;

  // Find the subscription
  const subscription =
    await ctx.internalAdapter.findSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error("Subscription not found");
  }

  // Find the customer
  const customer = await ctx.internalAdapter.findCustomerById(
    subscription.customerId,
  );
  if (!customer) {
    throw new Error("Customer not found");
  }

  // Get the plan and price
  const plan = ctx.internalAdapter.findPlanByCode(subscription.planCode);
  const price = ctx.internalAdapter.getPlanPrice(
    subscription.planCode,
    subscription.interval,
  );

  ctx.logger.info("Processing trial end", {
    subscriptionId: subscription.id,
    customerId: customer.id,
    planCode: plan?.code,
  });

  // If customer has no payment method, cancel the subscription
  if (!customer.providerCustomerId) {
    ctx.logger.info("No payment method, canceling subscription", {
      subscriptionId: subscription.id,
    });

    const canceledSubscription = await ctx.internalAdapter.cancelSubscription(
      subscription.id,
    );

    return {
      subscription: canceledSubscription ?? {
        ...subscription,
        status: "canceled",
      },
      converted: false,
    };
  }

  // Customer has payment method — charge first period and activate
  const now = await ctx.timeProvider.now(customer.externalId);

  // Charge if plan has a cost
  if (price && price.amount > 0) {
    if (!ctx.paymentAdapter?.charge) {
      ctx.logger.error("Payment adapter does not support direct charging", {
        subscriptionId: subscription.id,
      });

      const pastDueSubscription =
        await ctx.internalAdapter.updateSubscription(subscription.id, {
          status: "past_due",
        });

      return {
        subscription: pastDueSubscription ?? {
          ...subscription,
          status: "past_due",
        },
        converted: false,
      };
    }

    const chargeResult = await ctx.paymentAdapter.charge({
      customer: {
        id: customer.id,
        email: customer.email,
        providerCustomerId: customer.providerCustomerId,
      },
      amount: price.amount,
      currency: price.currency,
      description: `First period: ${plan?.name ?? subscription.planCode} (${subscription.interval})`,
      metadata: {
        subscriptionId: subscription.id,
        customerId: customer.id,
        type: "trial_conversion",
        planCode: subscription.planCode,
      },
    });

    if (chargeResult.status === "failed") {
      ctx.logger.warn("Trial conversion charge failed", {
        subscriptionId: subscription.id,
        error: chargeResult.error,
      });

      const pastDueSubscription =
        await ctx.internalAdapter.updateSubscription(subscription.id, {
          status: "past_due",
        });

      return {
        subscription: pastDueSubscription ?? {
          ...subscription,
          status: "past_due",
        },
        converted: false,
      };
    }

    // Create payment record
    await ctx.internalAdapter.createPayment({
      customerId: customer.id,
      subscriptionId: subscription.id,
      type: "subscription",
      status: "succeeded",
      amount: price.amount,
      currency: price.currency,
      providerPaymentId: chargeResult.providerPaymentId,
      metadata: {
        planCode: subscription.planCode,
        interval: subscription.interval,
        type: "trial_conversion",
      },
    });
  }

  // Calculate new billing period
  const newPeriodStart = now;
  const newPeriodEnd = new Date(now);
  if (subscription.interval === "yearly") {
    newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
  } else if (subscription.interval === "quarterly") {
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 3);
  } else {
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
  }

  // Activate subscription with new billing period
  const activeSubscription = await ctx.internalAdapter.updateSubscription(
    subscription.id,
    {
      status: "active",
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
    },
  );

  ctx.logger.info("Trial converted to active subscription", {
    subscriptionId: subscription.id,
    newPeriodStart: newPeriodStart.toISOString(),
    newPeriodEnd: newPeriodEnd.toISOString(),
  });

  return {
    subscription: activeSubscription ?? { ...subscription, status: "active" },
    converted: true,
  };
}
