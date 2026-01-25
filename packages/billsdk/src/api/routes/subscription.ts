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

      // Process payment - adapter decides the flow
      const result = await ctx.paymentAdapter.processPayment({
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

      // Handle payment result based on adapter's decision
      if (result.status === "active") {
        // Cancel any other active subscriptions for this customer
        const existingSubscriptions =
          await ctx.internalAdapter.listSubscriptions(customer.id);
        for (const existing of existingSubscriptions) {
          if (
            existing.id !== subscription.id &&
            (existing.status === "active" || existing.status === "trialing")
          ) {
            await ctx.internalAdapter.cancelSubscription(existing.id);
          }
        }

        // Payment completed immediately - activate subscription
        const activeSubscription = await ctx.internalAdapter.updateSubscription(
          subscription.id,
          { status: "active" },
        );

        // Update customer with provider ID if returned
        if (result.providerCustomerId && !customer.providerCustomerId) {
          await ctx.internalAdapter.updateCustomer(customer.id, {
            providerCustomerId: result.providerCustomerId,
          });
        }

        return {
          subscription: activeSubscription ?? {
            ...subscription,
            status: "active",
          },
        };
      }

      if (result.status === "pending") {
        // Payment pending - user needs to complete payment flow
        await ctx.internalAdapter.updateSubscription(subscription.id, {
          providerCheckoutSessionId: result.sessionId,
        });

        // Update customer with provider ID if returned
        if (result.providerCustomerId && !customer.providerCustomerId) {
          await ctx.internalAdapter.updateCustomer(customer.id, {
            providerCustomerId: result.providerCustomerId,
          });
        }

        return {
          subscription,
          redirectUrl: result.redirectUrl,
        };
      }

      // result.status === "failed"
      // Mark the subscription as canceled since payment failed
      await ctx.internalAdapter.updateSubscription(subscription.id, {
        status: "canceled",
      });
      throw new Error(result.error);
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

      // Find customer
      const customer = await ctx.internalAdapter.findCustomerByExternalId(
        body.customerId,
      );
      if (!customer) {
        throw new Error("Customer not found");
      }

      // Find active subscription
      const subscription =
        await ctx.internalAdapter.findSubscriptionByCustomerId(customer.id);
      if (!subscription) {
        throw new Error("No active subscription found");
      }

      // Cancel subscription
      if (body.cancelAt === "immediately") {
        const canceled = await ctx.internalAdapter.cancelSubscription(
          subscription.id,
        );
        return { subscription: canceled, canceledImmediately: true };
      }

      // Cancel at period end
      const canceled = await ctx.internalAdapter.cancelSubscription(
        subscription.id,
        subscription.currentPeriodEnd,
      );
      return {
        subscription: canceled,
        canceledImmediately: false,
        accessUntil: subscription.currentPeriodEnd,
      };
    },
  },
};
