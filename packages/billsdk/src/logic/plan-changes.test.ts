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
        code: "free",
        name: "Free",
        prices: [{ amount: 0, currency: "usd", interval: "monthly" }],
        features: [],
      },
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
        code: "enterprise",
        name: "Enterprise",
        prices: [{ amount: 5000, currency: "usd", interval: "monthly" }],
        features: ["export", "api_access"],
      },
      {
        code: "trial-pro",
        name: "Trial Pro",
        prices: [
          {
            amount: 2000,
            currency: "usd",
            interval: "monthly",
            trialDays: 14,
          },
        ],
        features: ["export", "api_access"],
      },
    ],
    ...overrides,
  });
  return { billing, payment };
}

async function subscribe(
  billing: ReturnType<typeof createBilling>["billing"],
  payment: ReturnType<typeof createBilling>["payment"],
  planCode: string,
) {
  await billing.api.createCustomer({
    externalId: "user_1",
    email: "user@test.com",
  });
  const { subscription } = await billing.api.createSubscription({
    customerId: "user_1",
    planCode,
  });
  await billing.handler(payment.createWebhookRequest(subscription.id));
  return billing.api.getSubscription({ customerId: "user_1" });
}

describe("Plan changes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("upgrades", () => {
    it("calculates proration correctly mid-period", async () => {
      const { billing, payment } = createBilling();
      await subscribe(billing, payment, "starter");

      vi.setSystemTime(new Date("2025-01-07T00:00:00Z"));

      const result = await billing.api.changeSubscription({
        customerId: "user_1",
        newPlanCode: "pro",
      });

      expect(result.scheduled).toBe(false);
      expect(result.subscription!.planCode).toBe("pro");
      // credit = round(1000/31 * 25) = 806
      // netAmount = 2000 - 806 = 1194
      expect(result.payment).not.toBeNull();
      expect(result.payment!.amount).toBe(1194);
      expect(result.payment!.type).toBe("upgrade");
    });

    it("gives full credit when upgrading same day as subscription", async () => {
      const { billing, payment } = createBilling();
      await subscribe(billing, payment, "starter");

      const result = await billing.api.changeSubscription({
        customerId: "user_1",
        newPlanCode: "pro",
      });

      // credit = round(1000/31 * 31) = 1000, netAmount = 2000 - 1000 = 1000
      expect(result.payment!.amount).toBe(1000);
    });

    it("gives near-zero credit when upgrading on last day", async () => {
      const { billing, payment } = createBilling();
      await subscribe(billing, payment, "starter");

      vi.setSystemTime(new Date("2025-01-31T00:00:00Z"));

      const result = await billing.api.changeSubscription({
        customerId: "user_1",
        newPlanCode: "pro",
      });

      // credit = round(1000/31 * 1) = 32, netAmount = 2000 - 32 = 1968
      expect(result.payment!.amount).toBe(1968);
    });

    it("charges full new plan price when upgrading from free", async () => {
      const { billing, payment } = createBilling();
      await subscribe(billing, payment, "free");

      vi.setSystemTime(new Date("2025-01-15T00:00:00Z"));

      const result = await billing.api.changeSubscription({
        customerId: "user_1",
        newPlanCode: "pro",
      });

      expect(result.payment!.amount).toBe(2000);
    });

    it("resets billing period start and end", async () => {
      const { billing, payment } = createBilling();
      await subscribe(billing, payment, "starter");

      vi.setSystemTime(new Date("2025-01-15T00:00:00Z"));

      const result = await billing.api.changeSubscription({
        customerId: "user_1",
        newPlanCode: "pro",
      });

      expect(result.subscription!.currentPeriodStart).toEqual(
        new Date("2025-01-15T00:00:00Z"),
      );
      expect(result.subscription!.currentPeriodEnd).toEqual(
        new Date("2025-02-15T00:00:00Z"),
      );
    });
  });

  describe("downgrades", () => {
    it("schedules for period end instead of applying immediately", async () => {
      const { billing, payment } = createBilling();
      await subscribe(billing, payment, "pro");

      vi.setSystemTime(new Date("2025-01-15T00:00:00Z"));

      const result = await billing.api.changeSubscription({
        customerId: "user_1",
        newPlanCode: "starter",
      });

      expect(result.scheduled).toBe(true);
      expect(result.subscription!.planCode).toBe("pro");
      expect(result.subscription!.scheduledPlanCode).toBe("starter");
      expect(result.effectiveAt).toEqual(new Date("2025-02-01T00:00:00Z"));
    });

    it("does not create a payment", async () => {
      const { billing, payment } = createBilling();
      await subscribe(billing, payment, "pro");

      const result = await billing.api.changeSubscription({
        customerId: "user_1",
        newPlanCode: "starter",
      });

      expect(result.payment).toBeNull();
    });
  });

  describe("validation", () => {
    it("throws when changing to the same plan", async () => {
      const { billing, payment } = createBilling();
      await subscribe(billing, payment, "starter");

      await expect(
        billing.api.changeSubscription({
          customerId: "user_1",
          newPlanCode: "starter",
        }),
      ).rejects.toThrow("Already on this plan");
    });
  });

  describe("during trial", () => {
    it("charges new plan full price and activates immediately", async () => {
      const { billing, payment } = createBilling();
      await billing.api.createCustomer({
        externalId: "user_1",
        email: "user@test.com",
      });
      const { subscription } = await billing.api.createSubscription({
        customerId: "user_1",
        planCode: "trial-pro",
      });
      // Confirm webhook to set providerCustomerId
      await billing.handler(payment.createWebhookRequest(subscription.id));

      vi.setSystemTime(new Date("2025-01-05T00:00:00Z"));

      const result = await billing.api.changeSubscription({
        customerId: "user_1",
        newPlanCode: "enterprise",
      });

      expect(result.scheduled).toBe(false);
      expect(result.subscription!.status).toBe("active");
      expect(result.subscription!.planCode).toBe("enterprise");
      expect(result.payment!.amount).toBe(5000);
    });
  });
});
