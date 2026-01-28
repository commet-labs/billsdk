import type { BillingInterval } from "../types/models";

/**
 * Result of a proration calculation
 */
export interface ProrationResult {
  /**
   * Credit for unused time on current plan (in cents)
   */
  credit: number;
  /**
   * Charge for new plan prorated to remaining time (in cents)
   */
  charge: number;
  /**
   * Net amount to charge (charge - credit, can be negative = credit to customer)
   */
  netAmount: number;
  /**
   * Number of days remaining in period
   */
  daysRemaining: number;
  /**
   * Total days in the billing period
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
 * Calculate proration for a plan change
 *
 * BillSDK handles all proration logic. The payment adapter only sees
 * the final amount to charge.
 *
 * @example
 * ```typescript
 * // User on Pro ($20/mo) upgrading to Enterprise ($50/mo) mid-month
 * const result = calculateProration({
 *   oldPlanAmount: 2000,  // $20 in cents
 *   newPlanAmount: 5000,  // $50 in cents
 *   currentPeriodStart: new Date('2024-01-01'),
 *   currentPeriodEnd: new Date('2024-01-31'),
 *   changeDate: new Date('2024-01-15'),
 * });
 *
 * // result.credit = 1032 (unused Pro time)
 * // result.charge = 2581 (prorated Enterprise)
 * // result.netAmount = 1549 ($15.49 to charge)
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

  // Calculate total days in billing period
  const totalDays = daysBetween(currentPeriodStart, currentPeriodEnd);

  // Calculate days remaining (from change date to period end)
  const daysRemaining = daysBetween(changeDate, currentPeriodEnd);

  // Ensure daysRemaining is not negative or greater than totalDays
  const effectiveDaysRemaining = Math.max(
    0,
    Math.min(daysRemaining, totalDays),
  );

  // Calculate credit for unused time on old plan
  // credit = (oldPlanAmount / totalDays) * daysRemaining
  const credit = Math.round(
    (oldPlanAmount / totalDays) * effectiveDaysRemaining,
  );

  // Calculate charge for new plan prorated
  // charge = (newPlanAmount / totalDays) * daysRemaining
  const charge = Math.round(
    (newPlanAmount / totalDays) * effectiveDaysRemaining,
  );

  // Net amount (can be negative if downgrading)
  const netAmount = charge - credit;

  return {
    credit,
    charge,
    netAmount,
    daysRemaining: effectiveDaysRemaining,
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
