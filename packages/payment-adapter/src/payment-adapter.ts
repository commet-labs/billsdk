import type {
  ChargeParams,
  ChargeResult,
  PaymentAdapter,
  PaymentResult,
  RefundParams,
  RefundResult,
} from "@billsdk/core";

/**
 * Default payment adapter - activates subscriptions immediately
 *
 * Use this adapter when:
 * - You don't need real payments (development, testing)
 * - All your plans are free
 * - You handle payments outside of BillSDK
 *
 * All operations succeed immediately with mock IDs, making it perfect
 * for testing the full billing flow without real payment processing.
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
      // Returns a mock providerCustomerId so upgrades/charges work
      return {
        status: "active",
        providerCustomerId: `cus_mock_${crypto.randomUUID()}`,
      };
    },

    // No confirmPayment needed - we never return "pending"

    /**
     * Charge a customer directly (for renewals, upgrades, etc.)
     *
     * Default adapter always succeeds with a mock payment ID.
     */
    async charge(_params: ChargeParams): Promise<ChargeResult> {
      return {
        status: "success",
        providerPaymentId: `pay_mock_${crypto.randomUUID()}`,
      };
    },

    /**
     * Refund a payment
     *
     * Default adapter always succeeds with a mock refund ID.
     */
    async refund(_params: RefundParams): Promise<RefundResult> {
      return {
        status: "refunded",
        providerRefundId: `ref_mock_${crypto.randomUUID()}`,
      };
    },
  };
}
