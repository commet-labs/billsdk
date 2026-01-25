import type { PaymentAdapter, PaymentResult } from "@billsdk/core";

/**
 * Default payment adapter - activates subscriptions immediately
 *
 * Use this adapter when:
 * - You don't need real payments (development, testing)
 * - All your plans are free
 * - You handle payments outside of BillSDK
 *
 * @example
 * ```typescript
 * import { billsdk } from "billsdk";
 * import { paymentAdapter } from "@billsdk/payment-adapter";
 *
 * // Explicit usage
 * const billing = billsdk({
 *   payment: paymentAdapter(),
 *   plans: [...],
 * });
 *
 * // Or without adapter - billsdk uses paymentAdapter() by default
 * const billing = billsdk({
 *   plans: [...],
 * });
 *
 * // Subscriptions activate immediately
 * const { subscription } = await billing.api.createSubscription({
 *   customerId: "user_123",
 *   planCode: "free",
 * });
 * // subscription.status === "active"
 * ```
 */
export function paymentAdapter(): PaymentAdapter {
  return {
    id: "default",

    async processPayment(): Promise<PaymentResult> {
      // Default adapter activates immediately - no payment required
      return { status: "active" };
    },

    // No confirmPayment needed - we never return "pending"
  };
}
