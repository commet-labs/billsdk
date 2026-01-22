import { z } from "zod";
import type { BillingEndpoint, EndpointContext } from "../../types/api";

/**
 * Get subscription query schema
 */
const getSubscriptionQuerySchema = z.object({
  customerId: z.string().min(1),
});

/**
 * Subscription endpoints
 */
export const subscriptionEndpoints: Record<string, BillingEndpoint> = {
  getSubscription: {
    path: "/subscription",
    options: {
      method: "GET",
      query: getSubscriptionQuerySchema,
    },
    handler: async (
      context: EndpointContext<unknown, z.infer<typeof getSubscriptionQuerySchema>>,
    ) => {
      const { ctx, query } = context;

      // Find customer by external ID
      const customer = await ctx.internalAdapter.findCustomerByExternalId(query.customerId);
      if (!customer) {
        return { subscription: null };
      }

      // Find active subscription
      const subscription = await ctx.internalAdapter.findSubscriptionByCustomerId(customer.id);
      if (!subscription) {
        return { subscription: null };
      }

      // Get plan and price details
      const plan = await ctx.internalAdapter.findPlanById(subscription.planId);
      const price = await ctx.internalAdapter.findPlanPriceById(subscription.priceId);

      return {
        subscription,
        plan,
        price,
      };
    },
  },
};
