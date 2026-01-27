import type { BillingInterval, Subscription } from "../types/models";

/**
 * Result of calculating the next billing period
 */
export interface NextPeriodResult {
  /**
   * Start of the next billing period
   */
  start: Date;
  /**
   * End of the next billing period
   */
  end: Date;
}

/**
 * Calculate the next billing period based on the current period end and interval
 *
 * @example
 * ```typescript
 * const next = calculateNextPeriod(
 *   new Date('2024-01-31'),
 *   'monthly'
 * );
 * // next.start = 2024-01-31
 * // next.end = 2024-02-29 (or 2024-03-01 depending on month)
 * ```
 */
export function calculateNextPeriod(
  currentPeriodEnd: Date,
  interval: BillingInterval,
): NextPeriodResult {
  const start = new Date(currentPeriodEnd);
  const end = new Date(currentPeriodEnd);

  switch (interval) {
    case "yearly":
      end.setFullYear(end.getFullYear() + 1);
      break;
    case "quarterly":
      end.setMonth(end.getMonth() + 3);
      break;
    default:
      // monthly or any other interval defaults to monthly
      end.setMonth(end.getMonth() + 1);
      break;
  }

  return { start, end };
}

/**
 * Check if a subscription is due for renewal
 *
 * A subscription is due for renewal if:
 * - Status is "active" or "trialing"
 * - Current period end is in the past or today
 * - Not scheduled for cancellation
 *
 * @example
 * ```typescript
 * if (isRenewalDue(subscription)) {
 *   // Trigger renewal charge
 * }
 * ```
 */
export function isRenewalDue(subscription: Subscription): boolean {
  // Only active or trialing subscriptions can renew
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return false;
  }

  // If scheduled for cancellation, don't renew
  if (subscription.cancelAt) {
    return false;
  }

  // Check if current period has ended
  const now = new Date();
  return subscription.currentPeriodEnd <= now;
}

/**
 * Check if a trial period has ended and subscription should convert to paid
 *
 * @example
 * ```typescript
 * if (isTrialEnded(subscription)) {
 *   // Charge for first paid period
 * }
 * ```
 */
export function isTrialEnded(subscription: Subscription): boolean {
  if (subscription.status !== "trialing") {
    return false;
  }

  if (!subscription.trialEnd) {
    return false;
  }

  const now = new Date();
  return subscription.trialEnd <= now;
}

/**
 * Calculate the number of days until renewal
 *
 * @returns Number of days until renewal, or -1 if already past due
 */
export function daysUntilRenewal(subscription: Subscription): number {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = subscription.currentPeriodEnd.getTime() - now.getTime();

  if (diff < 0) {
    return -1; // Past due
  }

  return Math.ceil(diff / msPerDay);
}

/**
 * Check if a subscription is in a grace period after failed payment
 *
 * Grace period is typically 3-7 days after currentPeriodEnd where
 * the subscription is still accessible but marked as "past_due"
 */
export function isInGracePeriod(
  subscription: Subscription,
  gracePeriodDays = 3,
): boolean {
  if (subscription.status !== "past_due") {
    return false;
  }

  const now = new Date();
  const graceEnd = new Date(subscription.currentPeriodEnd);
  graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);

  return now <= graceEnd;
}
