import type { DBAdapter, TimeProvider } from "@billsdk/core";

export interface TimeTravelState extends Record<string, unknown> {
  id: string;
  simulatedTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Store adapter reference for the time provider
let dbAdapter: DBAdapter | null = null;

/**
 * Create a time travel provider that reads directly from the database
 */
export function createTimeTravelProvider(adapter: DBAdapter): TimeProvider {
  dbAdapter = adapter;
  return {
    now: async () => {
      try {
        const state = await adapter.findOne<TimeTravelState>({
          model: "time_travel_state",
          where: [{ field: "id", operator: "eq", value: "current" }],
        });
        return state?.simulatedTime
          ? new Date(state.simulatedTime)
          : new Date();
      } catch {
        return new Date();
      }
    },
  };
}

/**
 * Set the simulated time in the database
 */
export async function setSimulatedTime(
  adapter: DBAdapter,
  time: Date | null,
): Promise<void> {
  const realNow = new Date();

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
 * Get the simulated time from the database
 */
export async function getSimulatedTime(
  adapter?: DBAdapter,
): Promise<Date | null> {
  const db = adapter ?? dbAdapter;
  if (!db) return null;

  try {
    const state = await db.findOne<TimeTravelState>({
      model: "time_travel_state",
      where: [{ field: "id", operator: "eq", value: "current" }],
    });
    return state?.simulatedTime ? new Date(state.simulatedTime) : null;
  } catch {
    return null;
  }
}

/**
 * Check if time travel is active (has simulated time set)
 */
export async function isTimeTravelActive(
  adapter?: DBAdapter,
): Promise<boolean> {
  const time = await getSimulatedTime(adapter);
  return time !== null;
}
