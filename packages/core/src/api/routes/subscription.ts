import { z } from "zod";
import type { BillingEndpoint, EndpointContext } from "../../types/api";

/**
 * Get subscription query schema
 */
const getSubscriptionQuerySchema = z.object({
  customerId: z.string().min(1),
});

/**
 * Create subscription schema
 */
const createSubscriptionSchema = z.object({
  customerId: z.string().min(1),
  planCode: z.string().min(1),
  interval: z.enum(["monthly", "yearly"]).optional().default("monthly"),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
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

      // Check if payment adapter is configured
      if (!ctx.paymentAdapter) {
        throw new Error("Payment adapter not configured");
      }

      // Find customer
      const customer = await ctx.internalAdapter.findCustomerByExternalId(
        body.customerId,
      );
      if (!customer) {
        throw new Error("Customer not found");
      }

      // Find plan from config (synchronous)
      const plan = ctx.internalAdapter.findPlanByCode(body.planCode);
      if (!plan) {
        throw new Error("Plan not found");
      }

      // Find price for interval (synchronous)
      const price = ctx.internalAdapter.getPlanPrice(
        body.planCode,
        body.interval,
      );
      if (!price) {
        throw new Error(
          `No price found for plan ${body.planCode} with interval ${body.interval}`,
        );
      }

      // Create subscription in pending state
      const subscription = await ctx.internalAdapter.createSubscription({
        customerId: customer.id,
        planCode: body.planCode,
        interval: body.interval,
        status: "pending_payment",
        trialDays: price.trialDays,
      });

      // Create checkout session
      const checkoutResult = await ctx.paymentAdapter.createCheckoutSession({
        customer: {
          id: customer.id,
          email: customer.email,
          providerCustomerId: customer.providerCustomerId,
        },
        plan: {
          code: plan.code,
          name: plan.name,
        },
        price: {
          amount: price.amount,
          currency: price.currency,
          interval: price.interval,
        },
        subscription: {
          id: subscription.id,
        },
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
        metadata: {
          subscriptionId: subscription.id,
          customerId: customer.id,
        },
      });

      // Update subscription with checkout session ID
      await ctx.internalAdapter.updateSubscription(subscription.id, {
        providerCheckoutSessionId: checkoutResult.sessionId,
      });

      // Update customer with provider customer ID if created
      if (checkoutResult.providerCustomerId && !customer.providerCustomerId) {
        await ctx.internalAdapter.updateCustomer(customer.id, {
          providerCustomerId: checkoutResult.providerCustomerId,
        });
      }

      return {
        subscription,
        checkoutUrl: checkoutResult.url,
      };
    },
  },
};
