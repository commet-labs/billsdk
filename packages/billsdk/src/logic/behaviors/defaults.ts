import type {
  OnPaymentFailedParams,
  OnPaymentFailedResult,
  OnRefundParams,
  OnRefundResult,
  OnSubscriptionCancelParams,
  OnSubscriptionCancelResult,
  OnTrialEndParams,
  OnTrialEndResult,
} from "@billsdk/core";
import type { BillingContext } from "../../context/create-context";
import { handlePaymentFailed as handlePaymentFailedService } from "../payment-failed-service";
import { createRefund as createRefundService } from "../refund-service";
import { cancelSubscription as cancelSubscriptionService } from "../subscription-service";
import { handleTrialEnd as handleTrialEndService } from "../trial-end-service";

/**
 * Default billing behaviors - these are the opinionated defaults that BillSDK
 * provides out of the box. Each can be overridden in the billsdk config.
 *
 * Philosophy: Defaults should be safe, predictable, and align with common
 * billing best practices.
 */
export const defaultBehaviors = {
  /**
   * Default onRefund behavior: Delegates to refund service.
   *
   * The service handles all business logic:
   * - Process the refund via payment adapter
   * - Cancel the associated subscription (BillSDK opinionated default)
   *
   * Override this behavior if you want different logic (e.g., refund without cancel).
   */
  onRefund: async (
    ctx: BillingContext,
    params: OnRefundParams,
  ): Promise<OnRefundResult> => {
    return createRefundService(ctx, {
      paymentId: params.paymentId,
      amount: params.amount,
      reason: params.reason,
    });
  },

  /**
   * Default onPaymentFailed behavior: Delegates to payment-failed service.
   *
   * The service handles all business logic:
   * - Find subscription
   * - Mark as past_due
   *
   * Override this behavior if you want different logic (e.g., immediate cancel).
   */
  onPaymentFailed: async (
    ctx: BillingContext,
    params: OnPaymentFailedParams,
  ): Promise<OnPaymentFailedResult> => {
    return handlePaymentFailedService(ctx, {
      subscriptionId: params.subscriptionId,
      error: params.error,
    });
  },

  /**
   * Default onSubscriptionCancel behavior: Delegates to cancel service.
   *
   * The service handles all business logic:
   * - Find customer and subscription
   * - Cancel immediately or at period end
   *
   * Override this behavior if you want different logic (e.g., downgrade to free).
   */
  onSubscriptionCancel: async (
    ctx: BillingContext,
    params: OnSubscriptionCancelParams,
  ): Promise<OnSubscriptionCancelResult> => {
    return cancelSubscriptionService(ctx, {
      customerId: params.customerId,
      cancelAt: params.cancelAt,
    });
  },

  /**
   * Default onTrialEnd behavior: Delegates to trial-end service.
   *
   * The service handles all business logic:
   * - If customer has payment method: activates subscription
   * - If no payment method: cancels subscription
   *
   * Override this behavior if you want different logic (e.g., extend trial).
   */
  onTrialEnd: async (
    ctx: BillingContext,
    params: OnTrialEndParams,
  ): Promise<OnTrialEndResult> => {
    return handleTrialEndService(ctx, {
      subscriptionId: params.subscriptionId,
    });
  },
};

/**
 * Type for the default behaviors object
 */
export type DefaultBehaviors = typeof defaultBehaviors;
