import type {
  OnDowngradeParams,
  OnPaymentFailedParams,
  OnRefundParams,
  OnSubscriptionCancelParams,
  OnTrialEndParams,
} from "@billsdk/core";
import type { BillingContext } from "../../context/create-context";

/**
 * Default billing behaviors - these are the opinionated defaults that BillSDK
 * provides out of the box. Each can be overridden in the billsdk config.
 *
 * Philosophy: Defaults should be safe, predictable, and align with common
 * billing best practices.
 */
export const defaultBehaviors = {
  /**
   * Default onRefund behavior: Cancel the subscription immediately.
   *
   * Rationale: A refund typically means the customer is unhappy or doesn't
   * want the service. Canceling prevents further charges and clearly ends
   * the relationship.
   */
  onRefund: async (ctx: BillingContext, params: OnRefundParams) => {
    const { subscription } = params;

    if (subscription && subscription.status !== "canceled") {
      ctx.logger.info("Default onRefund: Canceling subscription", {
        subscriptionId: subscription.id,
        customerId: params.customer.id,
      });

      await ctx.internalAdapter.cancelSubscription(subscription.id);
    }
  },

  /**
   * Default onPaymentFailed behavior: Mark subscription as past_due.
   *
   * Rationale: Give the customer a chance to update their payment method
   * rather than immediately canceling. Most payment failures are recoverable
   * (expired card, insufficient funds).
   */
  onPaymentFailed: async (
    ctx: BillingContext,
    params: OnPaymentFailedParams,
  ) => {
    const { subscription } = params;

    ctx.logger.info(
      "Default onPaymentFailed: Marking subscription as past_due",
      {
        subscriptionId: subscription.id,
        customerId: params.customer.id,
        error: params.error,
      },
    );

    await ctx.internalAdapter.updateSubscription(subscription.id, {
      status: "past_due",
    });
  },

  /**
   * Default onSubscriptionCancel behavior: No additional action.
   *
   * Rationale: The subscription is already canceled by the service.
   * Additional actions (emails, analytics) are app-specific and should
   * be implemented by the developer if needed.
   */
  onSubscriptionCancel: async (
    ctx: BillingContext,
    params: OnSubscriptionCancelParams,
  ) => {
    ctx.logger.info("Default onSubscriptionCancel: No additional action", {
      subscriptionId: params.subscription.id,
      customerId: params.customer.id,
      cancelAt: params.cancelAt,
    });
    // No action by default - the cancellation is already handled
  },

  /**
   * Default onTrialEnd behavior: Attempt to charge or cancel.
   *
   * Rationale: When a trial ends, the customer should either convert to
   * a paid subscription or lose access. We don't auto-extend trials.
   */
  onTrialEnd: async (ctx: BillingContext, params: OnTrialEndParams) => {
    const { subscription, customer, plan } = params;

    ctx.logger.info("Default onTrialEnd: Processing trial conversion", {
      subscriptionId: subscription.id,
      customerId: customer.id,
      planCode: plan.code,
    });

    // If customer has no payment method, cancel the subscription
    if (!customer.providerCustomerId) {
      ctx.logger.info(
        "Default onTrialEnd: No payment method, canceling subscription",
        { subscriptionId: subscription.id },
      );

      await ctx.internalAdapter.cancelSubscription(subscription.id);
      return;
    }

    // Otherwise, the subscription will be charged on renewal
    // Update status to active to begin the paid period
    await ctx.internalAdapter.updateSubscription(subscription.id, {
      status: "active",
    });
  },

  /**
   * Default onDowngrade behavior: No credit issued.
   *
   * Rationale: Downgrades take effect immediately without refunding
   * the unused portion of the higher plan. This is simpler and avoids
   * complex credit tracking. Developers can override to issue credits.
   */
  onDowngrade: async (ctx: BillingContext, params: OnDowngradeParams) => {
    ctx.logger.info("Default onDowngrade: No credit issued", {
      subscriptionId: params.subscription.id,
      customerId: params.customer.id,
      previousPlan: params.previousPlan.code,
      newPlan: params.newPlan.code,
      creditAmount: params.creditAmount,
    });
    // No action by default - the plan change is already handled
  },
};

/**
 * Type for the default behaviors object
 */
export type DefaultBehaviors = typeof defaultBehaviors;
