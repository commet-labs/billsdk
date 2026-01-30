import type {
  ChargeParams,
  ChargeResult,
  ConfirmResult,
  PaymentAdapter,
  PaymentParams,
  PaymentResult,
  RefundParams,
  RefundResult,
} from "@billsdk/core";
import type Stripe from "stripe";

export interface StripePaymentOptions {
  secretKey: string;
  webhookSecret: string;
  apiVersion?: string;
}

/**
 * Stripe payment adapter for BillSDK
 *
 * BillSDK owns all billing logic (subscriptions, proration, renewals).
 * Stripe only handles payment processing via PaymentIntent/SetupIntent.
 *
 * Flow:
 * 1. Free plans: Checkout with mode="setup" to collect card for future use
 * 2. Paid plans: Checkout with mode="payment" + setup_future_usage
 * 3. Upgrades/renewals: Direct charge via PaymentIntent (off_session)
 *
 * @example
 * ```typescript
 * const billing = billsdk({
 *   payment: stripePayment({
 *     secretKey: process.env.STRIPE_SECRET_KEY!,
 *     webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
 *   }),
 * });
 * ```
 */
export function stripePayment(options: StripePaymentOptions): PaymentAdapter {
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

      // Free plans: setup mode to collect card
      // Paid plans: payment mode to charge and save card
      const isFree = params.price.amount === 0;

      const session = await stripeClient.checkout.sessions.create(
        isFree
          ? {
              mode: "setup",
              customer: stripeCustomerId,
              payment_method_types: ["card"],
              success_url: params.successUrl,
              cancel_url: params.cancelUrl,
              metadata: {
                ...params.metadata,
                billsdkSubscriptionId: params.subscription.id,
                billsdkCustomerId: params.customer.id,
              },
            }
          : {
              mode: "payment",
              customer: stripeCustomerId,
              payment_intent_data: {
                setup_future_usage: "off_session",
                metadata: {
                  billsdkSubscriptionId: params.subscription.id,
                  billsdkCustomerId: params.customer.id,
                },
              },
              line_items: [
                {
                  price_data: {
                    currency: params.price.currency,
                    unit_amount: params.price.amount,
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
            },
      );

      return {
        status: "pending",
        redirectUrl: session.url!,
        sessionId: session.id,
        providerCustomerId: stripeCustomerId,
      };
    },

    async confirmPayment(request: Request): Promise<ConfirmResult | null> {
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

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.metadata?.billsdkSubscriptionId;
        const customerId = session.customer as string;

        if (!subscriptionId) {
          throw new Error("Missing billsdkSubscriptionId in session metadata");
        }

        let providerPaymentMethodId: string | undefined;

        // Setup mode (free plans): get payment method from SetupIntent
        if (session.mode === "setup" && session.setup_intent) {
          const setupIntentId = session.setup_intent as string;
          const setupIntent =
            await stripeClient.setupIntents.retrieve(setupIntentId);
          providerPaymentMethodId =
            typeof setupIntent.payment_method === "string"
              ? setupIntent.payment_method
              : setupIntent.payment_method?.id;

          // Set as default for future off_session charges
          if (providerPaymentMethodId && customerId) {
            await stripeClient.customers.update(customerId, {
              invoice_settings: {
                default_payment_method: providerPaymentMethodId,
              },
            });
          }

          return {
            subscriptionId,
            status: "active",
            providerCustomerId: customerId,
            providerData: {
              setupIntentId,
              paymentMethodId: providerPaymentMethodId,
            },
          };
        }

        // Payment mode (paid plans): get payment method from PaymentIntent
        const paymentIntentId = session.payment_intent as string;
        let amount: number | undefined;
        let currency: string | undefined;

        if (paymentIntentId) {
          const paymentIntent =
            await stripeClient.paymentIntents.retrieve(paymentIntentId);
          providerPaymentMethodId =
            typeof paymentIntent.payment_method === "string"
              ? paymentIntent.payment_method
              : paymentIntent.payment_method?.id;

          // Capture amount and currency for payment record
          amount = paymentIntent.amount;
          currency = paymentIntent.currency;

          // Set as default for future off_session charges
          if (providerPaymentMethodId && customerId) {
            await stripeClient.customers.update(customerId, {
              invoice_settings: {
                default_payment_method: providerPaymentMethodId,
              },
            });
          }
        }

        return {
          subscriptionId,
          status: "active",
          providerCustomerId: customerId,
          providerPaymentId: paymentIntentId,
          amount,
          currency,
          providerData: {
            paymentIntentId,
            paymentMethodId: providerPaymentMethodId,
          },
        };
      }

      if (event.type === "payment_intent.payment_failed") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const subscriptionId = paymentIntent.metadata?.billsdkSubscriptionId;

        if (!subscriptionId) {
          return null;
        }

        return {
          subscriptionId,
          status: "failed",
          providerCustomerId: paymentIntent.customer as string,
          providerData: {
            paymentIntentId: paymentIntent.id,
            error: paymentIntent.last_payment_error?.message,
          },
        };
      }

      return null;
    },

    async charge(params: ChargeParams): Promise<ChargeResult> {
      const stripeClient = await getStripe();

      try {
        const customer = await stripeClient.customers.retrieve(
          params.customer.providerCustomerId,
        );

        if (customer.deleted) {
          return {
            status: "failed",
            error: "Customer has been deleted",
          };
        }

        const defaultPaymentMethod =
          customer.invoice_settings?.default_payment_method;

        if (!defaultPaymentMethod) {
          return {
            status: "failed",
            error:
              "Customer does not have a default payment method. Please complete checkout first.",
          };
        }

        const paymentMethodId =
          typeof defaultPaymentMethod === "string"
            ? defaultPaymentMethod
            : defaultPaymentMethod.id;

        const paymentIntent = await stripeClient.paymentIntents.create({
          amount: params.amount,
          currency: params.currency,
          customer: params.customer.providerCustomerId,
          payment_method: paymentMethodId,
          description: params.description,
          confirm: true,
          off_session: true,
          metadata: {
            billsdkCustomerId: params.customer.id,
            ...params.metadata,
          },
        });

        if (
          paymentIntent.status === "succeeded" ||
          paymentIntent.status === "processing"
        ) {
          return {
            status: "success",
            providerPaymentId: paymentIntent.id,
          };
        }

        return {
          status: "failed",
          error: `Payment intent status: ${paymentIntent.status}`,
        };
      } catch (err) {
        const error = err as Error;
        return {
          status: "failed",
          error: error.message,
        };
      }
    },

    async refund(params: RefundParams): Promise<RefundResult> {
      const stripeClient = await getStripe();

      try {
        const refund = await stripeClient.refunds.create({
          payment_intent: params.providerPaymentId,
          amount: params.amount,
          reason: params.reason as Stripe.RefundCreateParams.Reason,
        });

        if (refund.status === "succeeded" || refund.status === "pending") {
          return {
            status: "refunded",
            providerRefundId: refund.id,
          };
        }

        return {
          status: "failed",
          error: `Refund status: ${refund.status}`,
        };
      } catch (err) {
        const error = err as Error;
        return {
          status: "failed",
          error: error.message,
        };
      }
    },
  };
}
