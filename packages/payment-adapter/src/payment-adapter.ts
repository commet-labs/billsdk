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

function testId(prefix: string): string {
  return `${prefix}_test_${crypto.randomUUID().slice(0, 8)}`;
}

export interface PaymentSession {
  sessionId: string;
  subscriptionId: string;
  customerId: string;
  providerCustomerId: string;
  amount: number;
  currency: string;
  planCode: string;
  interval: string;
  trial: boolean;
}

export interface ChargeRecord {
  params: ChargeParams;
  result: ChargeResult;
}

export interface RefundRecord {
  params: RefundParams;
  result: RefundResult;
}

export type ChargeBehavior =
  | "succeed"
  | "fail"
  | ((params: ChargeParams) => ChargeResult);

export type RefundBehavior =
  | "succeed"
  | "fail"
  | ((params: RefundParams) => RefundResult);

export interface PaymentAdapterOptions {
  charges?: ChargeBehavior;
  refunds?: RefundBehavior;
}

export interface PaymentAdapterInstance extends PaymentAdapter {
  sessions: PaymentSession[];
  charges: ChargeRecord[];
  refunds: RefundRecord[];
  createWebhookRequest(
    subscriptionId: string,
    type?: "session.completed" | "session.failed",
  ): Request;
  reset(): void;
}

/**
 * Payment adapter for development and testing
 *
 * Simulates a real payment provider flow:
 * 1. `processPayment` returns `pending` with a redirect URL and session ID
 * 2. Call `createWebhookRequest(subscriptionId)` to simulate payment confirmation
 * 3. Pass the request to `billing.handler()` to complete the flow
 *
 * Charges and refunds are configurable: "succeed", "fail", or a custom function.
 *
 * @example
 * ```typescript
 * const payment = paymentAdapter();
 * const billing = billsdk({ payment, plans: [...] });
 *
 * // Create subscription — returns pending
 * const { subscription, redirectUrl } = await billing.api.createSubscription({
 *   customerId: "user_123",
 *   planCode: "pro",
 * });
 *
 * // Simulate payment confirmation (what Stripe webhook would do)
 * await billing.handler(payment.createWebhookRequest(subscription.id));
 *
 * // Subscription is now active
 * const sub = await billing.api.getSubscription({ customerId: "user_123" });
 * // sub.status === "active"
 * ```
 */
export function paymentAdapter(
  options: PaymentAdapterOptions = {},
): PaymentAdapterInstance {
  const { charges: chargeBehavior = "succeed", refunds: refundBehavior = "succeed" } =
    options;

  const sessions: PaymentSession[] = [];
  const chargeRecords: ChargeRecord[] = [];
  const refundRecords: RefundRecord[] = [];

  function resolveCharge(params: ChargeParams): ChargeResult {
    if (typeof chargeBehavior === "function") return chargeBehavior(params);
    if (chargeBehavior === "fail")
      return { status: "failed", error: "card_declined" };
    return {
      status: "success",
      providerPaymentId: testId("pay"),
    };
  }

  function resolveRefund(params: RefundParams): RefundResult {
    if (typeof refundBehavior === "function") return refundBehavior(params);
    if (refundBehavior === "fail")
      return { status: "failed", error: "refund_failed" };
    return {
      status: "refunded",
      providerRefundId: testId("ref"),
    };
  }

  return {
    id: "test",

    sessions,
    charges: chargeRecords,
    refunds: refundRecords,

    async processPayment(params: PaymentParams): Promise<PaymentResult> {
      const sessionId = testId("ses");
      const providerCustomerId =
        params.customer.providerCustomerId ?? testId("cus");

      sessions.push({
        sessionId,
        subscriptionId: params.subscription.id,
        customerId: params.customer.id,
        providerCustomerId,
        amount: params.price.amount,
        currency: params.price.currency,
        planCode: params.plan.code,
        interval: params.price.interval,
        trial: !!params.trial,
      });

      return {
        status: "pending",
        redirectUrl: `https://test-checkout.billsdk.dev/${sessionId}`,
        sessionId,
        providerCustomerId,
      };
    },

    async confirmPayment(request: Request): Promise<ConfirmResult | null> {
      const body = (await request.json()) as {
        type: string;
        subscriptionId: string;
      };

      if (body.type !== "session.completed" && body.type !== "session.failed") {
        return null;
      }

      const session = sessions.find(
        (s) => s.subscriptionId === body.subscriptionId,
      );
      if (!session) return null;

      if (body.type === "session.failed") {
        return {
          subscriptionId: session.subscriptionId,
          status: "failed",
          providerCustomerId: session.providerCustomerId,
        };
      }

      return {
        subscriptionId: session.subscriptionId,
        status: "active",
        providerCustomerId: session.providerCustomerId,
        providerPaymentId: session.amount > 0 ? testId("pay") : undefined,
        amount: session.amount,
        currency: session.currency,
      };
    },

    async charge(params: ChargeParams): Promise<ChargeResult> {
      const result = resolveCharge(params);
      chargeRecords.push({ params, result });
      return result;
    },

    async refund(params: RefundParams): Promise<RefundResult> {
      const result = resolveRefund(params);
      refundRecords.push({ params, result });
      return result;
    },

    createWebhookRequest(
      subscriptionId: string,
      type: "session.completed" | "session.failed" = "session.completed",
    ): Request {
      return new Request("http://localhost/api/billing/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, subscriptionId }),
      });
    },

    reset() {
      sessions.length = 0;
      chargeRecords.length = 0;
      refundRecords.length = 0;
    },
  };
}
