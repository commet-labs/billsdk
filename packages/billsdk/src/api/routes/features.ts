import { z } from "zod";
import type { BillingEndpoint, EndpointContext } from "../../types/api";

/**
 * Check feature access query schema
 */
const checkFeatureQuerySchema = z.object({
  customerId: z.string().min(1),
  feature: z.string().min(1),
});

/**
 * List features query schema
 */
const listFeaturesQuerySchema = z.object({
  customerId: z.string().min(1),
});

/**
 * Feature endpoints
 */
export const featureEndpoints: Record<string, BillingEndpoint> = {
  checkFeature: {
    path: "/features/check",
    options: {
      method: "GET",
      query: checkFeatureQuerySchema,
    },
    handler: async (
      context: EndpointContext<
        unknown,
        z.infer<typeof checkFeatureQuerySchema>
      >,
    ) => {
      const { ctx, query } = context;

      const result = await ctx.internalAdapter.checkFeatureAccess(
        query.customerId,
        query.feature,
      );
      return result;
    },
  },

  listFeatures: {
    path: "/features",
    options: {
      method: "GET",
      query: listFeaturesQuerySchema,
    },
    handler: async (
      context: EndpointContext<
        unknown,
        z.infer<typeof listFeaturesQuerySchema>
      >,
    ) => {
      const { ctx, query } = context;

      // Find customer
      const customer = await ctx.internalAdapter.findCustomerByExternalId(
        query.customerId,
      );
      if (!customer) {
        return { features: [] };
      }

      // Find active subscription
      const subscription =
        await ctx.internalAdapter.findSubscriptionByCustomerId(customer.id);
      if (!subscription) {
        return { features: [] };
      }

      // Get plan features from config (synchronous)
      const featureCodes = ctx.internalAdapter.getPlanFeatures(
        subscription.planCode,
      );
      const features = featureCodes.map((code: string) => {
        const feature = ctx.internalAdapter.findFeatureByCode(code);
        return {
          code,
          name: feature?.name ?? code,
          type: feature?.type ?? "boolean",
          enabled: true,
        };
      });

      return { features };
    },
  },
};
