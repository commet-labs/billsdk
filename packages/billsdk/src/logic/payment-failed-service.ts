import type { Subscription } from "@billsdk/core";
import type { BillingContext } from "../context/create-context";

export interface HandlePaymentFailedParams {
  /**
   * Subscription ID whose payment failed
   */
  subscriptionId: string;
  /**
   * Error message from the payment provider
   */
  error?: string;
}

export interface HandlePaymentFailedResult {
  /**
   * The subscription that was marked as past_due
   */
  subscription: Subscription;
}

/**
 * Handle a failed payment for a subscription.
 *
 * This is the single source of truth for payment failure logic.
 * The default behavior marks the subscription as past_due to give
 * the customer a chance to update their payment method.
 */
export async function handlePaymentFailed(
  ctx: BillingContext,
  params: HandlePaymentFailedParams,
): Promise<HandlePaymentFailedResult> {
  const { subscriptionId, error } = params;

  // Find the subscription
  const subscription =
    await ctx.internalAdapter.findSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error("Subscription not found");
  }

  ctx.logger.info("Payment failed, marking subscription as past_due", {
    subscriptionId: subscription.id,
    error,
  });

  // Update subscription status to past_due
  const updatedSubscription = await ctx.internalAdapter.updateSubscription(
    subscription.id,
    { status: "past_due" },
  );

  return {
    subscription: updatedSubscription ?? {
      ...subscription,
      status: "past_due",
    },
  };
}
