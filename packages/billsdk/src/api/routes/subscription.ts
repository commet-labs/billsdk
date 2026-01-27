import { z } from "zod";
import { calculateProration } from "../../logic/proration";
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

      // Check if already on the same plan
      if (subscription.planCode === body.newPlanCode) {
        throw new Error("Already on this plan");
      }

      // Get current plan price
      const oldPlan = ctx.internalAdapter.findPlanByCode(subscription.planCode);
      const oldPrice = ctx.internalAdapter.getPlanPrice(
        subscription.planCode,
        subscription.interval,
      );
      if (!oldPrice) {
        throw new Error("Current plan price not found");
      }

      // Get new plan and price
      const newPlan = ctx.internalAdapter.findPlanByCode(body.newPlanCode);
      if (!newPlan) {
        throw new Error("New plan not found");
      }

      const newPrice = ctx.internalAdapter.getPlanPrice(
        body.newPlanCode,
        subscription.interval,
      );
      if (!newPrice) {
        throw new Error(
          `No price found for plan ${body.newPlanCode} with interval ${subscription.interval}`,
        );
      }

      let payment = null;

      // Calculate proration if enabled
      if (body.prorate) {
        const proration = calculateProration({
          oldPlanAmount: oldPrice.amount,
          newPlanAmount: newPrice.amount,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          changeDate: new Date(),
        });

        ctx.logger.info("Proration calculated", {
          credit: proration.credit,
          charge: proration.charge,
          netAmount: proration.netAmount,
          daysRemaining: proration.daysRemaining,
        });

        // If there's a positive net amount, charge the customer
        if (proration.netAmount > 0) {
          // Check if adapter supports direct charging
          if (!ctx.paymentAdapter?.charge) {
            throw new Error(
              "Payment adapter does not support direct charging. Cannot process upgrade.",
            );
          }

          // Customer must have a saved payment method
          if (!customer.providerCustomerId) {
            throw new Error(
              "Customer does not have a saved payment method. Cannot process upgrade.",
            );
          }

          // Charge the difference
          const chargeResult = await ctx.paymentAdapter.charge({
            customer: {
              id: customer.id,
              email: customer.email,
              providerCustomerId: customer.providerCustomerId,
            },
            amount: proration.netAmount,
            currency: newPrice.currency,
            description: `Upgrade from ${oldPlan?.name ?? subscription.planCode} to ${newPlan.name}`,
            metadata: {
              subscriptionId: subscription.id,
              customerId: customer.id,
              type: "upgrade",
              oldPlanCode: subscription.planCode,
              newPlanCode: body.newPlanCode,
            },
          });

          if (chargeResult.status === "failed") {
            throw new Error(chargeResult.error ?? "Charge failed");
          }

          // Record the payment
          payment = await ctx.internalAdapter.createPayment({
            customerId: customer.id,
            subscriptionId: subscription.id,
            type: "upgrade",
            status: "succeeded",
            amount: proration.netAmount,
            currency: newPrice.currency,
            providerPaymentId: chargeResult.providerPaymentId,
            metadata: {
              oldPlanCode: subscription.planCode,
              newPlanCode: body.newPlanCode,
              proration: {
                credit: proration.credit,
                charge: proration.charge,
              },
            },
          });
        }
        // If netAmount is negative (downgrade), we could issue a credit
        // For now, we just update the plan without refunding
      }

      // Update subscription with new plan
      const updatedSubscription = await ctx.internalAdapter.updateSubscription(
        subscription.id,
        { planCode: body.newPlanCode },
      );

      return {
        subscription: updatedSubscription,
        previousPlan: oldPlan,
        newPlan,
        payment,
      };
    },
  },
};
