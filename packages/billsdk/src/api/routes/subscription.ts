import { z } from "zod";
import type { BillingContext } from "../../context/create-context";
import {
  cancelSubscription as cancelSubscriptionService,
  changeSubscription as changeSubscriptionService,
  createSubscription as createSubscriptionService,
} from "../../logic/subscription-service";
import type { BillingEndpoint, EndpointContext } from "../../types/api";

/**
 * Get subscription query schema
 */
const getSubscriptionQuerySchema = z.object({
  customerId: z.string().min(1),
});

/**
 * Create subscription schema
 * successUrl and cancelUrl are optional - only required if payment adapter needs them
 */
const createSubscriptionSchema = z.object({
  customerId: z.string().min(1),
  planCode: z.string().min(1),
  interval: z.enum(["monthly", "yearly"]).optional().default("monthly"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

/**
 * Cancel subscription schema
 */
const cancelSubscriptionSchema = z.object({
  customerId: z.string().min(1),
  cancelAt: z
    .enum(["period_end", "immediately"])
    .optional()
    .default("period_end"),
});

/**
 * Change subscription (upgrade/downgrade) schema
 */
const changeSubscriptionSchema = z.object({
  customerId: z.string().min(1),
  newPlanCode: z.string().min(1),
  /**
   * Whether to prorate the charge/credit
   * If false, the new plan starts at the next billing cycle
   */
  prorate: z.boolean().optional().default(true),
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
      context: EndpointContext<
        unknown,
        z.infer<typeof getSubscriptionQuerySchema>
      >,
    ) => {
      const { ctx, query } = context;

      // Find customer by external ID
      const customer = await ctx.internalAdapter.findCustomerByExternalId(
        query.customerId,
      );
      if (!customer) {
        return { subscription: null };
      }

      // Find active subscription
      const subscription =
        await ctx.internalAdapter.findSubscriptionByCustomerId(customer.id);
      if (!subscription) {
        return { subscription: null };
      }

      // Get plan from config (synchronous)
      const plan = ctx.internalAdapter.findPlanByCode(subscription.planCode);
      const price = plan
        ? ctx.internalAdapter.getPlanPrice(
            subscription.planCode,
            subscription.interval,
          )
        : null;

      return {
        subscription,
        plan,
        price,
      };
    },
  },

  createSubscription: {
    path: "/subscription",
    options: {
      method: "POST",
      body: createSubscriptionSchema,
    },
    handler: async (
      context: EndpointContext<z.infer<typeof createSubscriptionSchema>>,
    ) => {
      const { ctx, body } = context;

      // Delegate to shared service
      return createSubscriptionService(ctx as BillingContext, {
        customerId: body.customerId,
        planCode: body.planCode,
        interval: body.interval,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
      });
    },
  },

  cancelSubscription: {
    path: "/subscription/cancel",
    options: {
      method: "POST",
      body: cancelSubscriptionSchema,
    },
    handler: async (
      context: EndpointContext<z.infer<typeof cancelSubscriptionSchema>>,
    ) => {
      const { ctx, body } = context;

      // Delegate to shared service
      return cancelSubscriptionService(ctx as BillingContext, {
        customerId: body.customerId,
        cancelAt: body.cancelAt,
      });
    },
  },

  changeSubscription: {
    path: "/subscription/change",
    options: {
      method: "POST",
      body: changeSubscriptionSchema,
    },
    handler: async (
      context: EndpointContext<z.infer<typeof changeSubscriptionSchema>>,
    ) => {
      const { ctx, body } = context;

      // Delegate to shared service
      // Cast ctx to BillingContext - at runtime it's the same object
      return changeSubscriptionService(ctx as BillingContext, {
        customerId: body.customerId,
        newPlanCode: body.newPlanCode,
        prorate: body.prorate,
      });
    },
  },
};
