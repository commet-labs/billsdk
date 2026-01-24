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

      // Handle webhook from payment provider
      const result = await ctx.paymentAdapter.handleWebhook(request);

      ctx.logger.debug("Webhook received", {
        type: result.type,
        data: result.data,
      });

      switch (result.type) {
        case "checkout.completed": {
          // Find subscription by checkout session ID
          if (result.data.sessionId) {
            const subscription =
              await ctx.internalAdapter.findSubscriptionByProviderSessionId(
                result.data.sessionId,
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
                providerSubscriptionId: result.data.providerSubscriptionId,
              });

              // Update customer provider ID if present
              if (result.data.providerCustomerId) {
                const customer = await ctx.internalAdapter.findCustomerById(
                  subscription.customerId,
                );
                if (customer && !customer.providerCustomerId) {
                  await ctx.internalAdapter.updateCustomer(customer.id, {
                    providerCustomerId: result.data.providerCustomerId,
                  });
                }
              }

              ctx.logger.info("Subscription activated", {
                subscriptionId: subscription.id,
                providerSubscriptionId: result.data.providerSubscriptionId,
              });
            }
          }
          break;
        }

        case "subscription.canceled": {
          // Find subscription by provider subscription ID
          if (result.data.providerSubscriptionId) {
            // For now, we'd need to search by providerSubscriptionId
            // This would require adding a findByProviderSubscriptionId method
            ctx.logger.info("Subscription canceled webhook received", {
              providerSubscriptionId: result.data.providerSubscriptionId,
            });
          }
          break;
        }

        case "payment.failed": {
          ctx.logger.warn("Payment failed webhook received", {
            data: result.data,
          });
          break;
        }

        default:
          ctx.logger.debug("Unknown webhook type", { type: result.type });
      }

      return { received: true };
    },
  },
};
