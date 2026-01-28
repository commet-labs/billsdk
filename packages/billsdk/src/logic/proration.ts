import type { BillingInterval } from "../types/models";

/**
 * Result of a proration calculation (period reset model)
 *
 * When upgrading, the billing period resets to start from the change date.
 * The user gets credit for unused days on the old plan, which is deducted
 * from the full price of the new plan.
 */
export interface ProrationResult {
  /**
   * Credit for unused time on current plan (in cents)
   */
  credit: number;
  /**
   * Full price of the new plan (in cents)
   */
  charge: number;
  /**
   * Net amount to charge: newPlanAmount - credit
   */
  netAmount: number;
  /**
   * Days used on old plan (from period start to change date)
   */
  daysUsed: number;
  /**
   * Total days in the original billing period
   */
  totalDays: number;
}

/**
 * Parameters for proration calculation
 */
export interface ProrationParams {
  /**
   * Current plan amount in cents
   */
  oldPlanAmount: number;
  /**
   * New plan amount in cents
   */
  newPlanAmount: number;
  /**
   * Start of current billing period
   */
  currentPeriodStart: Date;
  /**
   * End of current billing period
   */
  currentPeriodEnd: Date;
  /**
   * Date when the plan change occurs (defaults to now)
   */
  changeDate?: Date;
}

/**
 * Calculate the number of days between two dates
 */
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((end.getTime() - start.getTime()) / msPerDay);
}

/**
 * Calculate proration for a plan upgrade (period reset model)
 *
 * When upgrading:
 * 1. Calculate credit for unused days on old plan
 * 2. Charge full price of new plan minus the credit
 * 3. Reset billing period to start from change date
 *
 * @example
 * ```typescript
 * // User on Starter ($10/mo) upgrading to Pro ($20/mo)
 * // Subscribed Jan 1, upgrading Jan 7 (used 6 days, 25 remaining)
 * const result = calculateProration({
 *   oldPlanAmount: 1000,  // $10 in cents
 *   newPlanAmount: 2000,  // $20 in cents
 *   currentPeriodStart: new Date('2024-01-01'),
 *   currentPeriodEnd: new Date('2024-02-01'),
 *   changeDate: new Date('2024-01-07'),
 * });
 *
 * // result.credit = 806 ($8.06 - unused Starter time: 25/31 × $10)
 * // result.charge = 2000 ($20 - full Pro price)
 * // result.netAmount = 1194 ($11.94 to charge)
 * // New period: Jan 7 - Feb 7
 * ```
 */
export function calculateProration(params: ProrationParams): ProrationResult {
  const {
    oldPlanAmount,
    newPlanAmount,
    currentPeriodStart,
    currentPeriodEnd,
    changeDate = new Date(),
  } = params;

  const totalDays = daysBetween(currentPeriodStart, currentPeriodEnd);
  const daysUsed = daysBetween(currentPeriodStart, changeDate);
  const daysRemaining = totalDays - daysUsed;

  const effectiveDaysRemaining = Math.max(
    0,
    Math.min(daysRemaining, totalDays),
  );

  // Credit = unused portion of old plan
  const credit = Math.round(
    (oldPlanAmount / totalDays) * effectiveDaysRemaining,
  );

  // Charge = full price of new plan (period resets)
  const charge = newPlanAmount;

  // Net = new plan price minus credit
  const netAmount = Math.max(0, charge - credit);

  return {
    credit,
    charge,
    netAmount,
    daysUsed: Math.max(0, Math.min(daysUsed, totalDays)),
    totalDays,
  };
}

/**
 * Calculate the full amount for a new subscription period
 * (No proration - full amount for the interval)
 */
export function calculateFullPeriodAmount(
  amount: number,
  _interval: BillingInterval,
): number {
  // For now, just return the amount as-is
  // In the future, this could handle quarterly calculations, etc.
  return amount;
}
