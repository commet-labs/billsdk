import { z } from "zod";
import type { BillingEndpoint, EndpointContext } from "../../types/api";

/**
 * Plan endpoints - plans come from config, not DB
 */
export const planEndpoints: Record<string, BillingEndpoint> = {
  listPlans: {
    path: "/plans",
    options: {
      method: "GET",
    },
    handler: async (context: EndpointContext) => {
      const { ctx } = context;
      // Plans come from config, synchronous
      const plans = ctx.internalAdapter.listPlans({ includePrivate: false });
      return { plans };
    },
  },

  getPlan: {
    path: "/plan",
    options: {
      method: "GET",
      query: z.object({
        code: z.string(),
      }),
    },
    handler: async (context: EndpointContext<unknown, { code: string }>) => {
      const { ctx, query } = context;
      // Plans come from config, synchronous
      const plan = ctx.internalAdapter.findPlanByCode(query.code);

      if (!plan) {
        return { plan: null };
      }

      // Prices are included in the plan from config
      return { plan };
    },
  },
};
