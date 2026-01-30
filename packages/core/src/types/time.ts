/**
 * TimeProvider interface for time abstraction
 *
 * Allows plugins (like time-travel) to override the current time
 * for testing subscription cycles, trials, renewals, etc.
 */
export interface TimeProvider {
  /**
   * Get the current time
   * @param customerId - Optional customer ID for per-customer time simulation
   * @returns Simulated time for the customer if set, otherwise real time
   */
  now(customerId?: string): Promise<Date>;
}

/**
 * Default time provider that uses real system time
 */
export function createDefaultTimeProvider(): TimeProvider {
  return {
    now: async (_customerId?: string) => new Date(),
  };
}
