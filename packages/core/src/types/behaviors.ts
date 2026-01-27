import type { GenericBillingContext } from "./api";
import type { Customer, Payment, Plan, Subscription } from "./models";

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
 * Parameters for the onPaymentFailed behavior
 */
export interface OnPaymentFailedParams {
  /**
   * The subscription that failed to renew
   */
  subscription: Subscription;
  /**
   * The customer whose payment failed
   */
  customer: Customer;
  /**
   * Error message from the payment provider
   */
  error?: string;
  /**
   * Number of consecutive failed attempts
   */
  failedAttempts?: number;
}

/**
 * Parameters for the onSubscriptionCancel behavior
 */
export interface OnSubscriptionCancelParams {
  /**
   * The subscription being canceled
   */
  subscription: Subscription;
  /**
   * The customer canceling
   */
  customer: Customer;
  /**
   * Whether the cancellation is immediate or at period end
   */
  cancelAt: "immediately" | "period_end";
  /**
   * Reason for cancellation (if provided)
   */
  reason?: string;
}

/**
 * Parameters for the onTrialEnd behavior
 */
export interface OnTrialEndParams {
  /**
   * The subscription whose trial is ending
   */
  subscription: Subscription;
  /**
   * The customer whose trial is ending
   */
  customer: Customer;
  /**
   * The plan the customer was trialing
   */
  plan: Plan;
}

/**
 * Parameters for the onDowngrade behavior
 */
export interface OnDowngradeParams {
  /**
   * The subscription being downgraded
   */
  subscription: Subscription;
  /**
   * The customer downgrading
   */
  customer: Customer;
  /**
   * The previous (higher) plan
   */
  previousPlan: Plan;
  /**
   * The new (lower) plan
   */
  newPlan: Plan;
  /**
   * Credit amount in cents (unused portion of previous plan)
   */
  creditAmount: number;
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
 *       // Call default to process refund, but skip the cancel
 *       const result = await defaultBehavior();
 *       // Or do custom logic here
 *       return result;
 *     },
 *
 *     // Extend: add logging but keep default
 *     onPaymentFailed: async (ctx, params, defaultBehavior) => {
 *       await sendAlert(`Payment failed for ${params.customer.email}`);
 *       await defaultBehavior();
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
  onPaymentFailed?: BehaviorHandler<OnPaymentFailedParams>;

  /**
   * Triggered after a subscription is canceled.
   *
   * Default: No additional action (subscription is already canceled).
   *
   * Common overrides:
   * - Send retention email
   * - Log cancellation reason for analytics
   * - Trigger offboarding workflow
   */
  onSubscriptionCancel?: BehaviorHandler<OnSubscriptionCancelParams>;

  /**
   * Triggered when a trial period ends.
   *
   * Default: Attempt to charge for the plan, cancel if no payment method.
   *
   * Common overrides:
   * - Extend trial for engaged users
   * - Downgrade to free plan instead of canceling
   * - Send trial-end notification
   */
  onTrialEnd?: BehaviorHandler<OnTrialEndParams>;

  /**
   * Triggered when a customer downgrades to a lower plan.
   *
   * Default: No credit issued (change takes effect immediately).
   *
   * Common overrides:
   * - Issue prorated credit
   * - Apply credit to next invoice
   * - Schedule downgrade at period end
   */
  onDowngrade?: BehaviorHandler<OnDowngradeParams>;
}
