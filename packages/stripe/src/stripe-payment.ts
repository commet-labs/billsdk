import type {
  ConfirmResult,
  PaymentAdapter,
  PaymentParams,
  PaymentResult,
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

    async processPayment(params: PaymentParams): Promise<PaymentResult> {
      const stripeClient = await getStripe();

      // Validate required URLs for Stripe Checkout
      if (!params.successUrl || !params.cancelUrl) {
        return {
          status: "failed",
          error: "successUrl and cancelUrl are required for Stripe payments",
        };
      }

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
        status: "pending",
        redirectUrl: session.url!,
        sessionId: session.id,
        providerCustomerId: stripeCustomerId,
      };
    },

    async confirmPayment(request: Request): Promise<ConfirmResult> {
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

      // Handle checkout.session.completed event
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.metadata?.billsdkSubscriptionId;

        if (!subscriptionId) {
          throw new Error("Missing billsdkSubscriptionId in session metadata");
        }

        return {
          subscriptionId,
          status: "active",
          providerSubscriptionId: session.subscription as string,
          providerCustomerId: session.customer as string,
        };
      }

      // Handle payment failures
      if (event.type === "invoice.payment_failed") {
        const invoice = event.data.object as Stripe.Invoice;
        // Try to get subscription ID from invoice metadata or subscription
        const subscriptionId =
          (invoice.subscription_details?.metadata
            ?.billsdkSubscriptionId as string) ?? "";

        return {
          subscriptionId,
          status: "failed",
          providerSubscriptionId: invoice.subscription as string,
          providerCustomerId: invoice.customer as string,
        };
      }

      // For other events, we don't have a direct subscription mapping
      // This shouldn't happen in normal flow
      throw new Error(`Unhandled webhook event type: ${event.type}`);
    },
  };
}
