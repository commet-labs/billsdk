import type {
  CheckoutResult,
  PaymentAdapter,
  WebhookResult,
} from "@billsdk/core";

/**
 * Options for the default payment adapter
 */
export interface PaymentAdapterOptions {
  /**
   * Base URL for the checkout confirmation page
   * @default "/billing/confirm"
   */
  confirmUrl?: string;
}

/**
 * Default payment adapter for development and testing
 *
 * This adapter creates local checkout URLs that can be used to
 * simulate the payment flow without a real payment provider.
 *
 * @example
 * ```typescript
 * import { billsdk } from "billsdk";
 * import { paymentAdapter } from "billsdk/adapters/payment";
 *
 * const billing = billsdk({
 *   payment: paymentAdapter(),
 *   plans: [...],
 * });
 * ```
 */
export function paymentAdapter(
  options?: PaymentAdapterOptions,
): PaymentAdapter {
  const confirmUrl = options?.confirmUrl ?? "/billing/confirm";

  return {
    id: "default",

    async createCheckoutSession(params): Promise<CheckoutResult> {
      const sessionId = `session_${Date.now()}_${params.subscription.id}`;

      return {
        sessionId,
        url: `${confirmUrl}?session=${sessionId}`,
        providerCustomerId: `cus_${params.customer.id}`,
      };
    },

    async handleWebhook(request): Promise<WebhookResult> {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get("session");

      return {
        type: "checkout.completed",
        data: {
          sessionId: sessionId ?? undefined,
        },
      };
    },
  };
}

export default paymentAdapter;
