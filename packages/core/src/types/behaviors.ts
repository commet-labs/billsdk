import type { GenericBillingContext } from "./api";
import type { Payment, Subscription } from "./models";

/**
 * Parameters for the onRefund behavior (inputs)
 */
export interface OnRefundParams {
  /**
   * Payment ID to refund (BillSDK payment ID)
   */
  paymentId: string;
  /**
   * Amount to refund in cents (partial refund)
   * If omitted, full refund is issued
   */
  amount?: number;
  /**
   * Reason for the refund
   */
  reason?: string;
}

/**
 * Result of the onRefund behavior
 */
export interface OnRefundResult {
  /**
   * The refund payment record (negative amount)
   */
  refund: Payment;
  /**
   * The original payment that was refunded
   */
  originalPayment: Payment;
}

/**
 * Parameters for the onPaymentFailed behavior (inputs)
 */
export interface OnPaymentFailedParams {
  /**
   * Subscription ID whose payment failed
   */
  subscriptionId: string;
  /**
   * Error message from the payment provider
   */
  error?: string;
}

/**
 * Result of the onPaymentFailed behavior
 */
export interface OnPaymentFailedResult {
  /**
   * The subscription that was marked as past_due
   */
  subscription: Subscription;
}

/**
 * Parameters for the onSubscriptionCancel behavior (inputs)
 */
export interface OnSubscriptionCancelParams {
  /**
   * Customer ID (external ID)
   */
  customerId: string;
  /**
   * Whether to cancel immediately or at period end
   */
  cancelAt?: "immediately" | "period_end";
  /**
   * Reason for cancellation (if provided)
   */
  reason?: string;
}

/**
 * Result of the onSubscriptionCancel behavior
 */
export interface OnSubscriptionCancelResult {
  /**
   * The canceled subscription
   */
  subscription: Subscription | null;
  /**
   * Whether the subscription was canceled immediately
   */
  canceledImmediately: boolean;
  /**
   * Date until which the customer has access (if canceled at period end)
   */
  accessUntil?: Date;
}

/**
 * Parameters for the onTrialEnd behavior (inputs)
 */
export interface OnTrialEndParams {
  /**
   * Subscription ID whose trial is ending
   */
  subscriptionId: string;
}

/**
 * Result of the onTrialEnd behavior
 */
export interface OnTrialEndResult {
  /**
   * The subscription after trial processing
   */
  subscription: Subscription;
  /**
   * Whether the subscription was converted to paid
   */
  converted: boolean;
}

/**
 * Behavior handler type - receives context, params, and the default behavior function
 * TResult defaults to void for behaviors that don't return a value
 */
export type BehaviorHandler<TParams, TResult = void> = (
  ctx: GenericBillingContext,
  params: TParams,
  defaultBehavior: () => Promise<TResult>,
) => Promise<TResult>;

/**
 * Configurable billing behaviors with sensible defaults.
 *
 * Each behavior is triggered after a specific billing event and can be overridden
 * to customize the side effects. The `defaultBehavior` function is always provided
 * so you can:
 * 1. Call it to use the default
 * 2. Skip it entirely for custom logic
 * 3. Call it conditionally based on your business rules
 *
 * @example
 * ```typescript
 * billsdk({
 *   behaviors: {
 *     // Override: only refund, don't cancel subscription
 *     onRefund: async (ctx, { paymentId }, defaultBehavior) => {
 *       // Call default to process refund
 *       const result = await defaultBehavior();
 *       // Add custom logic
 *       await sendEmail("Refund processed");
 *       return result;
 *     },
 *
 *     // Override: downgrade to free instead of canceling
 *     onSubscriptionCancel: async (ctx, { customerId }, defaultBehavior) => {
 *       // Don't call defaultBehavior - do something else
 *       return ctx.api.changeSubscription({ customerId, newPlanCode: "free" });
 *     },
 *   },
 * });
 * ```
 */
export interface BillingBehaviors {
  /**
   * Triggered when a refund is requested.
   *
   * Default: Processes the refund and cancels the associated subscription immediately.
   *
   * Common overrides:
   * - Only refund without canceling subscription (goodwill refunds)
   * - Downgrade to free plan instead of canceling
   * - Add custom notification logic
   */
  onRefund?: BehaviorHandler<OnRefundParams, OnRefundResult>;

  /**
   * Triggered when a payment fails (e.g., card declined on renewal).
   *
   * Default: Marks subscription as `past_due`.
   *
   * Common overrides:
   * - Implement custom retry logic
   * - Send dunning emails
   * - Downgrade to free plan after N failures
   */
  onPaymentFailed?: BehaviorHandler<
    OnPaymentFailedParams,
    OnPaymentFailedResult
  >;

  /**
   * Triggered when a subscription cancellation is requested.
   *
   * Default: Cancels the subscription (immediately or at period end).
   *
   * Common overrides:
   * - Downgrade to free plan instead of canceling
   * - Send retention email before canceling
   * - Add custom cancellation logic
   */
  onSubscriptionCancel?: BehaviorHandler<
    OnSubscriptionCancelParams,
    OnSubscriptionCancelResult
  >;

  /**
   * Triggered when a trial period ends.
   *
   * Default: Activates subscription if payment method exists, otherwise cancels.
   *
   * Common overrides:
   * - Extend trial for engaged users
   * - Downgrade to free plan instead of canceling
   * - Send trial-end notification
   */
  onTrialEnd?: BehaviorHandler<OnTrialEndParams, OnTrialEndResult>;
}
