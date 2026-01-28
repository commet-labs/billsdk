import type { DBAdapter, TimeProvider } from "@billsdk/core";

/**
 * Time travel state stored in the database
 */
export interface TimeTravelState extends Record<string, unknown> {
  id: string;
  simulatedTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Internal cache for time travel state
 * Updated by the plugin endpoints
 */
export const timeTravelCache: {
  simulatedTime: Date | null;
  initialized: boolean;
} = {
  simulatedTime: null,
  initialized: false,
};

/**
 * Create a time provider that reads from cache
 *
 * When simulated time is set, returns that time.
 * Otherwise, returns the real current time.
 */
export function createTimeTravelProvider(): TimeProvider {
  return {
    now: () => {
      // Use cached state for synchronous access
      return timeTravelCache.simulatedTime
        ? new Date(timeTravelCache.simulatedTime)
        : new Date();
    },
  };
}

/**
 * Initialize the time travel cache from the database
 */
export async function initializeTimeTravelCache(
  adapter: DBAdapter,
): Promise<void> {
  try {
    const state = await adapter.findOne<TimeTravelState>({
      model: "time_travel_state",
      where: [{ field: "id", operator: "eq", value: "current" }],
    });
    if (state?.simulatedTime) {
      timeTravelCache.simulatedTime = new Date(state.simulatedTime);
    }
    timeTravelCache.initialized = true;
  } catch {
    // Table might not exist yet, that's ok
    timeTravelCache.initialized = true;
  }
}

/**
 * Set the simulated time (updates cache and database)
 */
export async function setSimulatedTime(
  adapter: DBAdapter,
  time: Date | null,
): Promise<void> {
  timeTravelCache.simulatedTime = time;

  const realNow = new Date();

  // Try to update first
  const existing = await adapter.findOne<TimeTravelState>({
    model: "time_travel_state",
    where: [{ field: "id", operator: "eq", value: "current" }],
  });

  if (existing) {
    await adapter.update<TimeTravelState>({
      model: "time_travel_state",
      where: [{ field: "id", operator: "eq", value: "current" }],
      update: {
        simulatedTime: time,
        updatedAt: realNow,
      },
    });
  } else {
    await adapter.create<TimeTravelState>({
      model: "time_travel_state",
      data: {
        id: "current",
        simulatedTime: time,
        createdAt: realNow,
        updatedAt: realNow,
      },
    });
  }
}

/**
 * Get the current simulated time from cache
 */
export function getSimulatedTime(): Date | null {
  return timeTravelCache.simulatedTime;
}

/**
 * Check if time travel is active
 */
export function isTimeTravelActive(): boolean {
  return timeTravelCache.simulatedTime !== null;
}
