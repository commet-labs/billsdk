import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paymentAdapter } from "@billsdk/payment-adapter";
import { createBillSDK } from "../billsdk/base";

// Upgrade same-day: starter($1000) → pro($2000)
// credit = 1000 (full starter price), netAmount = 2000 - 1000 = 1000
const UPGRADE_AMOUNT = 1000;

function createBilling() {
  const payment = paymentAdapter();
  const billing = createBillSDK({
    secret: "test-secret-that-is-at-least-32-characters-long!!",
    trustedOrigins: ["http://localhost:3000"],
    payment,
    features: [
      { code: "export", name: "Export", type: "boolean" },
    ],
    plans: [
      {
        code: "starter",
        name: "Starter",
        prices: [{ amount: 1000, currency: "usd", interval: "monthly" }],
        features: ["export"],
      },
      {
        code: "pro",
        name: "Pro",
        prices: [{ amount: 2000, currency: "usd", interval: "monthly" }],
        features: ["export"],
      },
    ],
  });
  return { billing, payment };
}

async function setupWithPayment(
  billing: ReturnType<typeof createBilling>["billing"],
  payment: ReturnType<typeof createBilling>["payment"],
) {
  await billing.api.createCustomer({ externalId: "user_1", email: "u@t.com" });
  const { subscription } = await billing.api.createSubscription({
    customerId: "user_1",
    planCode: "starter",
  });
  await billing.handler(payment.createWebhookRequest(subscription.id));

  // Upgrade creates a payment with providerPaymentId (via charge())
  const result = await billing.api.changeSubscription({
    customerId: "user_1",
    newPlanCode: "pro",
  });

  return result.payment!;
}

describe("Refunds", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("validation", () => {
    it("rejects refund exceeding remaining amount", async () => {
      const { billing, payment } = createBilling();
      const pay = await setupWithPayment(billing, payment);

      await expect(
        billing.api.createRefund({
          paymentId: pay.id,
          amount: UPGRADE_AMOUNT + 1000,
        }),
      ).rejects.toThrow(`Only ${UPGRADE_AMOUNT} is available for refund`);
    });

    it("rejects double full refund", async () => {
      const { billing, payment } = createBilling();
      const pay = await setupWithPayment(billing, payment);

      await billing.api.createRefund({ paymentId: pay.id });

      await expect(
        billing.api.createRefund({ paymentId: pay.id }),
      ).rejects.toThrow("Cannot refund payment with status");
    });
  });

  describe("full refund", () => {
    it("creates negative payment record and marks original as refunded", async () => {
      const { billing, payment } = createBilling();
      const pay = await setupWithPayment(billing, payment);

      const result = await billing.api.createRefund({ paymentId: pay.id });

      expect(result.refund.amount).toBe(-UPGRADE_AMOUNT);
      expect(result.refund.type).toBe("refund");
      expect(result.refund.status).toBe("succeeded");
      expect(result.originalPayment.status).toBe("refunded");
      expect(result.originalPayment.refundedAmount).toBe(UPGRADE_AMOUNT);
    });

    it("cancels the subscription (default behavior)", async () => {
      const { billing, payment } = createBilling();
      const pay = await setupWithPayment(billing, payment);

      await billing.api.createRefund({ paymentId: pay.id });

      const sub = await billing.api.getSubscription({ customerId: "user_1" });
      expect(sub).toBeNull();
    });
  });

  describe("partial refund", () => {
    it("keeps payment status as succeeded with partial refundedAmount", async () => {
      const { billing, payment } = createBilling();
      const pay = await setupWithPayment(billing, payment);

      const result = await billing.api.createRefund({
        paymentId: pay.id,
        amount: 300,
      });

      expect(result.originalPayment.status).toBe("succeeded");
      expect(result.originalPayment.refundedAmount).toBe(300);
      expect(result.refund.amount).toBe(-300);
    });

    it("accumulates multiple partial refunds correctly", async () => {
      const { billing, payment } = createBilling();
      const pay = await setupWithPayment(billing, payment);

      await billing.api.createRefund({ paymentId: pay.id, amount: 300 });
      const second = await billing.api.createRefund({
        paymentId: pay.id,
        amount: 400,
      });

      expect(second.originalPayment.refundedAmount).toBe(700);
      expect(second.originalPayment.status).toBe("succeeded");
    });

    it("transitions to refunded when partial refunds exhaust the amount", async () => {
      const { billing, payment } = createBilling();
      const pay = await setupWithPayment(billing, payment);

      await billing.api.createRefund({ paymentId: pay.id, amount: 300 });
      const final = await billing.api.createRefund({
        paymentId: pay.id,
        amount: UPGRADE_AMOUNT - 300,
      });

      expect(final.originalPayment.refundedAmount).toBe(UPGRADE_AMOUNT);
      expect(final.originalPayment.status).toBe("refunded");
    });
  });
});
