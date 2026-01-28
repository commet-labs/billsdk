/**
 * TimeProvider interface for time abstraction
 *
 * Allows plugins (like time-travel) to override the current time
 * for testing subscription cycles, trials, renewals, etc.
 */
export interface TimeProvider {
  /**
   * Get the current time
   * Returns simulated time if set, otherwise real time
   */
  now(): Date;
}

/**
 * Default time provider that uses real system time
 */
export function createDefaultTimeProvider(): TimeProvider {
  return {
    now: () => new Date(),
  };
}
