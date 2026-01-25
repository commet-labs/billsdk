import type { BillingContext } from "../../context/create-context";
import type { BillingEndpoint } from "../../types/api";

/**
 * Webhook endpoints
 */
export const webhookEndpoints: Record<string, BillingEndpoint> = {
  handleWebhook: {
    path: "/webhook",
    options: {
      method: "POST",
    },
    handler: async (context: { ctx: BillingContext; request: Request }) => {
      const { ctx, request } = context;

      if (!ctx.paymentAdapter) {
        throw new Error("Payment adapter not configured");
      }

      // Check if payment adapter supports confirmPayment
      if (!ctx.paymentAdapter.confirmPayment) {
        // Adapter doesn't need webhooks (e.g., default adapter that activates immediately)
        ctx.logger.debug("Payment adapter does not support confirmPayment");
        return { received: true };
      }

      // Confirm payment from webhook/callback
      const result = await ctx.paymentAdapter.confirmPayment(request);

      // If result is null, the event was acknowledged but not relevant to us
      if (!result) {
        ctx.logger.debug("Webhook event acknowledged but not processed");
        return { received: true };
      }

      ctx.logger.debug("Payment confirmation received", {
        subscriptionId: result.subscriptionId,
        status: result.status,
      });

      if (result.status === "active") {
        // Find the subscription
        const subscription = await ctx.internalAdapter.findSubscriptionById(
          result.subscriptionId,
        );

        if (subscription) {
          // Cancel any other active subscriptions for this customer
          const existingSubscriptions =
            await ctx.internalAdapter.listSubscriptions(
              subscription.customerId,
            );

          for (const existing of existingSubscriptions) {
            if (
              existing.id !== subscription.id &&
              (existing.status === "active" || existing.status === "trialing")
            ) {
              await ctx.internalAdapter.cancelSubscription(existing.id);
              ctx.logger.info("Canceled previous subscription", {
                subscriptionId: existing.id,
                planCode: existing.planCode,
              });
            }
          }

          // Update subscription to active
          await ctx.internalAdapter.updateSubscription(subscription.id, {
            status: "active",
            providerSubscriptionId: result.providerSubscriptionId,
          });

          // Update customer provider ID if present
          if (result.providerCustomerId) {
            const customer = await ctx.internalAdapter.findCustomerById(
              subscription.customerId,
            );
            if (customer && !customer.providerCustomerId) {
              await ctx.internalAdapter.updateCustomer(customer.id, {
                providerCustomerId: result.providerCustomerId,
              });
            }
          }

          ctx.logger.info("Subscription activated via webhook", {
            subscriptionId: subscription.id,
            providerSubscriptionId: result.providerSubscriptionId,
          });
        } else {
          ctx.logger.warn("Subscription not found for confirmation", {
            subscriptionId: result.subscriptionId,
          });
        }
      } else if (result.status === "failed") {
        // Mark subscription as failed/canceled
        const subscription = await ctx.internalAdapter.findSubscriptionById(
          result.subscriptionId,
        );

        if (subscription) {
          await ctx.internalAdapter.updateSubscription(subscription.id, {
            status: "canceled",
          });
          ctx.logger.warn("Payment failed, subscription canceled", {
            subscriptionId: subscription.id,
          });
        }
      }

      return { received: true };
    },
  },
};
