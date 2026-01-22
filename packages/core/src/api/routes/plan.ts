import { z } from "zod";
import type { BillingEndpoint, EndpointContext } from "../../types/api";

/**
 * Plan endpoints
 */
export const planEndpoints: Record<string, BillingEndpoint> = {
  listPlans: {
    path: "/plans",
    options: {
      method: "GET",
    },
    handler: async (context: EndpointContext) => {
      const { ctx } = context;

      const plans = await ctx.internalAdapter.listPlans({ includePrivate: false });
      return { plans };
    },
  },

  getPlan: {
    path: "/plan",
    options: {
      method: "GET",
      query: z.object({
        id: z.string().optional(),
        code: z.string().optional(),
      }),
    },
    handler: async (context: EndpointContext<unknown, { id?: string; code?: string }>) => {
      const { ctx, query } = context;

      let plan = null;
      if (query.id) {
        plan = await ctx.internalAdapter.findPlanById(query.id);
      } else if (query.code) {
        plan = await ctx.internalAdapter.findPlanByCode(query.code);
      }

      if (!plan) {
        return { plan: null };
      }

      // Get prices for the plan
      const prices = await ctx.internalAdapter.listPlanPrices(plan.id);

      return { plan, prices };
    },
  },
};
