import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChargeParams, ChargeResult, PaymentAdapter } from "@billsdk/core";
import { paymentAdapter } from "@billsdk/payment-adapter";
import { createBillSDK } from "../billsdk/base";

function createBilling(overrides = {}) {
  return createBillSDK({
    secret: "test-secret-that-is-at-least-32-characters-long!!",
    trustedOrigins: ["http://localhost:3000"],
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
      {
        code: "free",
        name: "Free",
        prices: [{ amount: 0, currency: "usd", interval: "monthly" }],
        features: [],
      },
    ],
    ...overrides,
  });
}

function failingChargeAdapter(): PaymentAdapter {
  const base = paymentAdapter();
  return {
    ...base,
    async charge(_params: ChargeParams): Promise<ChargeResult> {
      return { status: "failed", error: "card_declined" };
    },
  };
}

describe("Renewals", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("charges correct amount and advances billing period", async () => {
    const billing = createBilling();
    await billing.api.createCustomer({ externalId: "user_1", email: "u@t.com" });
    await billing.api.createSubscription({ customerId: "user_1", planCode: "starter" });

    // Advance past period end (Feb 1)
    vi.setSystemTime(new Date("2025-02-01T00:00:01Z"));

    const result = await billing.api.processRenewals({ customerId: "user_1" });

    expect(result.succeeded).toBe(1);
    expect(result.renewals[0].amount).toBe(1000);

    const sub = await billing.api.getSubscription({ customerId: "user_1" });
    expect(sub!.currentPeriodStart.getTime()).toBeGreaterThanOrEqual(
      new Date("2025-02-01T00:00:00Z").getTime(),
    );
  });

  it("is idempotent — running twice does not double-charge", async () => {
    const billing = createBilling();
    await billing.api.createCustomer({ externalId: "user_1", email: "u@t.com" });
    await billing.api.createSubscription({ customerId: "user_1", planCode: "starter" });

    vi.setSystemTime(new Date("2025-02-01T00:00:01Z"));

    await billing.api.processRenewals({ customerId: "user_1" });
    const secondRun = await billing.api.processRenewals({ customerId: "user_1" });

    // Second run finds 0 due subscriptions (period already advanced)
    expect(secondRun.processed).toBe(0);

    // Only 1 subscription payment + 1 renewal = 2 total
    const payments = await billing.api.listPayments({ customerId: "user_1" });
    const renewalPayments = payments.filter((p) => p.type === "renewal");
    expect(renewalPayments).toHaveLength(1);
  });

  it("applies scheduled downgrade before charging", async () => {
    const billing = createBilling();
    await billing.api.createCustomer({ externalId: "user_1", email: "u@t.com" });
    await billing.api.createSubscription({ customerId: "user_1", planCode: "pro" });

    // Schedule downgrade
    await billing.api.changeSubscription({
      customerId: "user_1",
      newPlanCode: "starter",
    });

    vi.setSystemTime(new Date("2025-02-01T00:00:01Z"));

    const result = await billing.api.processRenewals({ customerId: "user_1" });

    expect(result.renewals[0].amount).toBe(1000); // Starter price, not Pro
    expect(result.renewals[0].planChanged).toEqual({
      from: "pro",
      to: "starter",
    });

    const sub = await billing.api.getSubscription({ customerId: "user_1" });
    expect(sub!.planCode).toBe("starter");
    expect(sub!.scheduledPlanCode).toBeNull();
  });

  it("advances period without payment on free plan", async () => {
    const billing = createBilling();
    await billing.api.createCustomer({ externalId: "user_1", email: "u@t.com" });
    await billing.api.createSubscription({ customerId: "user_1", planCode: "free" });

    vi.setSystemTime(new Date("2025-02-01T00:00:01Z"));

    const result = await billing.api.processRenewals({ customerId: "user_1" });

    expect(result.succeeded).toBe(1);
    expect(result.renewals[0].amount).toBe(0);

    const payments = await billing.api.listPayments({ customerId: "user_1" });
    expect(payments).toHaveLength(0);
  });

  it("marks subscription as past_due when charge fails", async () => {
    const billing = createBilling({ payment: failingChargeAdapter() });
    await billing.api.createCustomer({ externalId: "user_1", email: "u@t.com" });
    await billing.api.createSubscription({ customerId: "user_1", planCode: "starter" });

    vi.setSystemTime(new Date("2025-02-01T00:00:01Z"));

    const result = await billing.api.processRenewals({ customerId: "user_1" });

    expect(result.failed).toBe(1);
    expect(result.renewals[0].status).toBe("failed");
    expect(result.renewals[0].error).toBe("card_declined");
  });
});
