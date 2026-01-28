import type { BillSDKPluginSchema } from "@billsdk/core";

/**
 * Schema for the time_travel_state table
 *
 * Stores the simulated time for time-travel testing.
 * Only one row with id="current" is used.
 */
export const timeTravelSchema: BillSDKPluginSchema = {
  time_travel_state: {
    fields: {
      id: { type: "string", required: true },
      simulatedTime: { type: "date", required: false },
      createdAt: { type: "date", required: true },
      updatedAt: { type: "date", required: true },
    },
  },
};
