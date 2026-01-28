import type { DBAdapter, TimeProvider } from "@billsdk/core";

export interface TimeTravelState extends Record<string, unknown> {
  id: string;
  simulatedTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const timeTravelCache: {
  simulatedTime: Date | null;
  initialized: boolean;
} = {
  simulatedTime: null,
  initialized: false,
};

export function createTimeTravelProvider(): TimeProvider {
  return {
    now: () => {
      return timeTravelCache.simulatedTime
        ? new Date(timeTravelCache.simulatedTime)
        : new Date();
    },
  };
}

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
    timeTravelCache.initialized = true;
  }
}

export async function setSimulatedTime(
  adapter: DBAdapter,
  time: Date | null,
): Promise<void> {
  timeTravelCache.simulatedTime = time;

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

export function getSimulatedTime(): Date | null {
  return timeTravelCache.simulatedTime;
}

export function isTimeTravelActive(): boolean {
  return timeTravelCache.simulatedTime !== null;
}
