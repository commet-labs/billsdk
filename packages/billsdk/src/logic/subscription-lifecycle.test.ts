import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paymentAdapter } from "@billsdk/payment-adapter";
import { createBillSDK } from "../billsdk/base";

function createBilling(overrides = {}) {
  const payment = paymentAdapter();
  const billing = createBillSDK({
    secret: "test-secret-that-is-at-least-32-characters-long!!",
    trustedOrigins: ["http://localhost:3000"],
    payment,
    features: [
      { code: "export", name: "Export", type: "boolean" },
      { code: "api_access", name: "API Access", type: "boolean" },
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
        features: ["export", "api_access"],
      },
      {
        code: "free",
        name: "Free",
        prices: [{ amount: 0, currency: "usd", interval: "monthly" }],
        features: [],
      },
    ],
    ...overrides,
  });
  return { billing, payment };
}

async function subscribe(
  billing: ReturnType<typeof createBilling>["billing"],
  payment: ReturnType<typeof createBilling>["payment"],
  customerId: string,
  planCode: string,
) {
  const { subscription } = await billing.api.createSubscription({
    customerId,
    planCode,
  });
  await billing.handler(payment.createWebhookRequest(subscription.id));
  return billing.api.getSubscription({ customerId });
}

describe("Subscription lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("creation", () => {
    it("activates with correct billing period on paid plan", async () => {
      const { billing, payment } = createBilling();
      await billing.api.createCustomer({
        externalId: "user_1",
        email: "user@test.com",
      });

      const sub = await subscribe(billing, payment, "user_1", "starter");

      expect(sub).not.toBeNull();
      expect(sub!.status).toBe("active");
      expect(sub!.planCode).toBe("starter");
      expect(sub!.currentPeriodStart).toEqual(
        new Date("2025-01-15T00:00:00Z"),
      );
      expect(sub!.currentPeriodEnd).toEqual(
        new Date("2025-02-15T00:00:00Z"),
      );
    });

    it("creates a payment record on paid plan", async () => {
      const { billing, payment } = createBilling();
      await billing.api.createCustomer({
        externalId: "user_1",
        email: "user@test.com",
      });
      await subscribe(billing, payment, "user_1", "starter");

      const payments = await billing.api.listPayments({
        customerId: "user_1",
      });

      expect(payments).toHaveLength(1);
      expect(payments[0].type).toBe("subscription");
      expect(payments[0].status).toBe("succeeded");
      expect(payments[0].amount).toBe(1000);
    });

    it("activates without payment record on free plan", async () => {
      const { billing, payment } = createBilling();
      await billing.api.createCustomer({
        externalId: "user_1",
        email: "user@test.com",
      });

      const sub = await subscribe(billing, payment, "user_1", "free");

      expect(sub).not.toBeNull();
      expect(sub!.status).toBe("active");

      const payments = await billing.api.listPayments({
        customerId: "user_1",
      });
      expect(payments).toHaveLength(0);
    });

    it("cancels old subscription when creating a new one", async () => {
      const { billing, payment } = createBilling();
      await billing.api.createCustomer({
        externalId: "user_1",
        email: "user@test.com",
      });

      await subscribe(billing, payment, "user_1", "starter");
      await subscribe(billing, payment, "user_1", "pro");

      const currentSub = await billing.api.getSubscription({
        customerId: "user_1",
      });

      expect(currentSub).not.toBeNull();
      expect(currentSub!.planCode).toBe("pro");
    });
  });

  describe("cancellation", () => {
    it("cancels immediately and revokes access", async () => {
      const { billing, payment } = createBilling();
      await billing.api.createCustomer({
        externalId: "user_1",
        email: "user@test.com",
      });
      await subscribe(billing, payment, "user_1", "starter");

      await billing.api.cancelSubscription({
        customerId: "user_1",
        cancelAt: "immediately",
      });

      const sub = await billing.api.getSubscription({ customerId: "user_1" });
      expect(sub).toBeNull();
    });

    it("schedules cancellation at period end without revoking access", async () => {
      const { billing, payment } = createBilling();
      await billing.api.createCustomer({
        externalId: "user_1",
        email: "user@test.com",
      });
      await subscribe(billing, payment, "user_1", "starter");

      await billing.api.cancelSubscription({
        customerId: "user_1",
        cancelAt: "period_end",
      });

      const sub = await billing.api.getSubscription({ customerId: "user_1" });
      expect(sub).not.toBeNull();
      expect(sub!.status).toBe("active");
      expect(sub!.cancelAt).toEqual(new Date("2025-02-15T00:00:00Z"));
    });

    it("throws when canceling without active subscription", async () => {
      const { billing } = createBilling();
      await billing.api.createCustomer({
        externalId: "user_1",
        email: "user@test.com",
      });

      await expect(
        billing.api.cancelSubscription({
          customerId: "user_1",
          cancelAt: "immediately",
        }),
      ).rejects.toThrow("No active subscription found");
    });

    it("throws when canceling for non-existent customer", async () => {
      const { billing } = createBilling();

      await expect(
        billing.api.cancelSubscription({
          customerId: "ghost",
          cancelAt: "immediately",
        }),
      ).rejects.toThrow("Customer not found");
    });
  });
});
