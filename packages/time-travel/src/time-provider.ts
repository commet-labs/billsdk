import type { DBAdapter, TimeProvider } from "@billsdk/core";

export interface TimeTravelState extends Record<string, unknown> {
  id: string; // customerId
  simulatedTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Store adapter reference for the time provider
let dbAdapter: DBAdapter | null = null;

/**
 * Create a time travel provider that reads directly from the database
 * Supports per-customer time simulation
 */
export function createTimeTravelProvider(adapter: DBAdapter): TimeProvider {
  dbAdapter = adapter;
  return {
    now: async (customerId?: string) => {
      if (!customerId) {
        return new Date();
      }

      try {
        const state = await adapter.findOne<TimeTravelState>({
          model: "time_travel_state",
          where: [{ field: "id", operator: "eq", value: customerId }],
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
 * Set the simulated time for a specific customer
 */
export async function setSimulatedTime(
  adapter: DBAdapter,
  customerId: string,
  time: Date | null,
): Promise<void> {
  const realNow = new Date();

  const existing = await adapter.findOne<TimeTravelState>({
    model: "time_travel_state",
    where: [{ field: "id", operator: "eq", value: customerId }],
  });

  if (existing) {
    await adapter.update<TimeTravelState>({
      model: "time_travel_state",
      where: [{ field: "id", operator: "eq", value: customerId }],
      update: {
        simulatedTime: time,
        updatedAt: realNow,
      },
    });
  } else {
    await adapter.create<TimeTravelState>({
      model: "time_travel_state",
      data: {
        id: customerId,
        simulatedTime: time,
        createdAt: realNow,
        updatedAt: realNow,
      },
    });
  }
}

/**
 * Get the simulated time for a specific customer
 */
export async function getSimulatedTime(
  customerId: string,
  adapter?: DBAdapter,
): Promise<Date | null> {
  const db = adapter ?? dbAdapter;
  if (!db) return null;

  try {
    const state = await db.findOne<TimeTravelState>({
      model: "time_travel_state",
      where: [{ field: "id", operator: "eq", value: customerId }],
    });
    return state?.simulatedTime ? new Date(state.simulatedTime) : null;
  } catch {
    return null;
  }
}

/**
 * Check if time travel is active for a specific customer
 */
export async function isTimeTravelActive(
  customerId: string,
  adapter?: DBAdapter,
): Promise<boolean> {
  const time = await getSimulatedTime(customerId, adapter);
  return time !== null;
}

/**
 * List all customers with active time travel
 */
export async function listTimeTravelStates(
  adapter?: DBAdapter,
): Promise<TimeTravelState[]> {
  const db = adapter ?? dbAdapter;
  if (!db) return [];

  try {
    const states = await db.findMany<TimeTravelState>({
      model: "time_travel_state",
      where: [],
    });
    return states.filter((s) => s.simulatedTime !== null);
  } catch {
    return [];
  }
}

/**
 * Reset time travel for a specific customer (remove simulated time)
 */
export async function resetSimulatedTime(
  adapter: DBAdapter,
  customerId: string,
): Promise<void> {
  await setSimulatedTime(adapter, customerId, null);
}
