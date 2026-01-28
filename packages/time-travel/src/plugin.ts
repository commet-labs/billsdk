import type { BillingEndpoint, BillSDKPlugin } from "@billsdk/core";
import { z } from "zod";
import { timeTravelSchema } from "./schema";
import {
  createTimeTravelProvider,
  getSimulatedTime,
  setSimulatedTime,
} from "./time-provider";

/**
 * Schema for set time endpoint
 */
const setTimeSchema = z.object({
  date: z.string().nullable(), // ISO string or null
});

/**
 * Schema for advance time endpoint
 */
const advanceTimeSchema = z.object({
  days: z.number().optional().default(0),
  hours: z.number().optional().default(0),
  months: z.number().optional().default(0),
});

/**
 * Time Travel Plugin for BillSDK
 *
 * Allows you to simulate time for testing subscription cycles,
 * trials, renewals, and other time-based billing logic.
 *
 * WARNING: This plugin is for development/testing only.
 * Do NOT use in production.
 *
 * @example
 * ```typescript
 * import { billsdk } from "billsdk";
 * import { timeTravelPlugin } from "@billsdk/time-travel";
 *
 * const billing = billsdk({
 *   // ... your config
 *   plugins: [timeTravelPlugin()],
 * });
 * ```
 */
export function timeTravelPlugin(): BillSDKPlugin {
  const endpoints: Record<string, BillingEndpoint> = {
    timeTravelSet: {
      path: "/time-travel/set",
      options: {
        method: "POST",
        body: setTimeSchema,
      },
      handler: async (context: {
        body: z.infer<typeof setTimeSchema>;
        ctx: { adapter: unknown };
      }) => {
        const { body, ctx } = context;
        const date = body.date ? new Date(body.date) : null;

        // biome-ignore lint/suspicious/noExplicitAny: Using adapter from context
        await setSimulatedTime(ctx.adapter as any, date);

        return {
          success: true,
          simulatedTime: date?.toISOString() ?? null,
          isSimulated: date !== null,
        };
      },
    },

    timeTravelGet: {
      path: "/time-travel/get",
      options: {
        method: "GET",
      },
      handler: async (context: { ctx: { adapter: unknown } }) => {
        const { ctx } = context;
        // biome-ignore lint/suspicious/noExplicitAny: Using adapter from context
        const simulatedTime = await getSimulatedTime(ctx.adapter as any);
        return {
          simulatedTime: simulatedTime?.toISOString() ?? null,
          isSimulated: simulatedTime !== null,
          realTime: new Date().toISOString(),
        };
      },
    },

    timeTravelAdvance: {
      path: "/time-travel/advance",
      options: {
        method: "POST",
        body: advanceTimeSchema,
      },
      handler: async (context: {
        body: z.infer<typeof advanceTimeSchema>;
        ctx: { adapter: unknown };
      }) => {
        const { body, ctx } = context;
        const { days = 0, hours = 0, months = 0 } = body;

        // biome-ignore lint/suspicious/noExplicitAny: Using adapter from context
        const adapter = ctx.adapter as any;

        // Get current time (simulated or real)
        const simulatedTime = await getSimulatedTime(adapter);
        const current = simulatedTime ? new Date(simulatedTime) : new Date();

        // Advance time
        current.setMonth(current.getMonth() + months);
        current.setDate(current.getDate() + days);
        current.setHours(current.getHours() + hours);

        await setSimulatedTime(adapter, current);

        return {
          success: true,
          simulatedTime: current.toISOString(),
          advanced: { days, hours, months },
        };
      },
    },

    timeTravelReset: {
      path: "/time-travel/reset",
      options: {
        method: "POST",
      },
      handler: async (context: { ctx: { adapter: unknown } }) => {
        const { ctx } = context;

        // biome-ignore lint/suspicious/noExplicitAny: Using adapter from context
        await setSimulatedTime(ctx.adapter as any, null);

        return {
          success: true,
          simulatedTime: null,
          realTime: new Date().toISOString(),
        };
      },
    },
  };

  return {
    id: "time-travel",
    name: "Time Travel",
    schema: timeTravelSchema,
    endpoints,

    init: async (ctx) => {
      // biome-ignore lint/suspicious/noExplicitAny: Using adapter from context
      const adapter = (ctx as any).adapter;

      // Replace the default time provider with our time travel provider
      // biome-ignore lint/suspicious/noExplicitAny: Modifying context timeProvider
      (ctx as any).timeProvider = createTimeTravelProvider(adapter);

      ctx.logger.warn("Time Travel plugin enabled. DO NOT USE IN PRODUCTION.");

      const simulatedTime = await getSimulatedTime(adapter);
      if (simulatedTime) {
        ctx.logger.info(
          `Time Travel: Currently simulating ${simulatedTime.toISOString()}`,
        );
      }
    },
  };
}
