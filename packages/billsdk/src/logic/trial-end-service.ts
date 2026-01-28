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
 * - If customer has a payment method: activates the subscription
 * - If no payment method: cancels the subscription
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

  // Get the plan
  const plan = ctx.internalAdapter.findPlanByCode(subscription.planCode);

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

  // Customer has payment method - activate the subscription
  ctx.logger.info("Payment method exists, activating subscription", {
    subscriptionId: subscription.id,
  });

  const activeSubscription = await ctx.internalAdapter.updateSubscription(
    subscription.id,
    { status: "active" },
  );

  return {
    subscription: activeSubscription ?? { ...subscription, status: "active" },
    converted: true,
  };
}
