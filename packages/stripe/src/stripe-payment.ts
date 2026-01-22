import type {
  CheckoutResult,
  PaymentAdapter,
  WebhookResult,
} from "@billsdk/core";
import type Stripe from "stripe";

/**
 * Stripe payment adapter options
 */
export interface StripePaymentOptions {
  /**
   * Stripe secret key
   */
  secretKey: string;

  /**
   * Stripe webhook secret for verifying signatures
   */
  webhookSecret: string;

  /**
   * Stripe API version (optional)
   */
  apiVersion?: string;
}

/**
 * Create a Stripe payment adapter for BillSDK
 *
 * @example
 * ```typescript
 * import { stripePayment } from "@billsdk/stripe";
 *
 * const payment = stripePayment({
 *   secretKey: process.env.STRIPE_SECRET_KEY!,
 *   webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 * });
 * ```
 */
export function stripePayment(options: StripePaymentOptions): PaymentAdapter {
  // Dynamic import to avoid bundling stripe if not used
  let stripe: Stripe | null = null;

  const getStripe = async (): Promise<Stripe> => {
    if (stripe) return stripe;

    const { default: Stripe } = await import("stripe");
    stripe = new Stripe(options.secretKey, {
      apiVersion:
        (options.apiVersion as Stripe.LatestApiVersion) ?? "2024-11-20.acacia",
    });

    return stripe;
  };

  return {
    id: "stripe",

    async createCheckoutSession(params): Promise<CheckoutResult> {
      const stripeClient = await getStripe();

      // Create or retrieve Stripe customer
      let stripeCustomerId = params.customer.providerCustomerId;

      if (!stripeCustomerId) {
        const stripeCustomer = await stripeClient.customers.create({
          email: params.customer.email,
          metadata: {
            billsdkCustomerId: params.customer.id,
          },
        });
        stripeCustomerId = stripeCustomer.id;
      }

      // Map interval to Stripe format
      const stripeInterval =
        params.price.interval === "yearly" ? "year" : "month";

      // Create checkout session
      const session = await stripeClient.checkout.sessions.create({
        mode: "subscription",
        customer: stripeCustomerId,
        line_items: [
          {
            price_data: {
              currency: params.price.currency,
              unit_amount: params.price.amount,
              recurring: {
                interval: stripeInterval,
              },
              product_data: {
                name: params.plan.name,
              },
            },
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        metadata: {
          ...params.metadata,
          billsdkSubscriptionId: params.subscription.id,
          billsdkCustomerId: params.customer.id,
        },
      });

      return {
        sessionId: session.id,
        url: session.url!,
        providerCustomerId: stripeCustomerId,
      };
    },

    async handleWebhook(request): Promise<WebhookResult> {
      const stripeClient = await getStripe();

      const signature = request.headers.get("stripe-signature");
      if (!signature) {
        throw new Error("Missing stripe-signature header");
      }

      const body = await request.text();

      let event: Stripe.Event;
      try {
        event = stripeClient.webhooks.constructEvent(
          body,
          signature,
          options.webhookSecret,
        );
      } catch (err) {
        throw new Error(`Webhook signature verification failed: ${err}`);
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          return {
            type: "checkout.completed",
            data: {
              sessionId: session.id,
              providerSubscriptionId: session.subscription as string,
              providerCustomerId: session.customer as string,
            },
          };
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          return {
            type: "subscription.updated",
            data: {
              providerSubscriptionId: subscription.id,
              providerCustomerId: subscription.customer as string,
              status: subscription.status,
            },
          };
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          return {
            type: "subscription.canceled",
            data: {
              providerSubscriptionId: subscription.id,
              providerCustomerId: subscription.customer as string,
            },
          };
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          return {
            type: "payment.failed",
            data: {
              providerSubscriptionId: invoice.subscription as string,
              providerCustomerId: invoice.customer as string,
            },
          };
        }

        default:
          return {
            type: "unknown",
            data: {},
          };
      }
    },
  };
}
