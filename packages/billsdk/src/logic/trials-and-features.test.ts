import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paymentAdapter } from "@billsdk/payment-adapter";
import { createBillSDK } from "../billsdk/base";

function createBilling(paymentOverrides = {}) {
  const payment = paymentAdapter(paymentOverrides);
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
        code: "pro",
        name: "Pro",
        prices: [{ amount: 2000, currency: "usd", interval: "monthly" }],
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
  });
  return { billing, payment };
}

async function subscribe(
  billing: ReturnType<typeof createBilling>["billing"],
  payment: ReturnType<typeof createBilling>["payment"],
  planCode: string,
) {
  await billing.api.createCustomer({ externalId: "user_1", email: "u@t.com" });
  const { subscription } = await billing.api.createSubscription({
    customerId: "user_1",
    planCode,
  });
  await billing.handler(payment.createWebhookRequest(subscription.id));
  return billing.api.getSubscription({ customerId: "user_1" });
}

describe("Trials", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in trialing status with correct trial dates", async () => {
    const { billing, payment } = createBilling();
    const sub = await subscribe(billing, payment, "trial-pro");

    expect(sub!.status).toBe("trialing");
    expect(sub!.trialEnd).toEqual(new Date("2025-01-15T00:00:00Z"));
  });

  it("converts to active after trial end with payment method", async () => {
    const { billing, payment } = createBilling();
    await subscribe(billing, payment, "trial-pro");

    vi.setSystemTime(new Date("2025-01-15T00:00:01Z"));

    const result = await billing.api.processRenewals({ customerId: "user_1" });

    expect(result.trialEnds).toHaveLength(1);
    expect(result.trialEnds[0].status).toBe("converted");

    const sub = await billing.api.getSubscription({ customerId: "user_1" });
    expect(sub!.status).toBe("active");
  });

  it("cancels after trial end when charge fails", async () => {
    const { billing, payment } = createBilling({ charges: "fail" });
    await subscribe(billing, payment, "trial-pro");

    vi.setSystemTime(new Date("2025-01-15T00:00:01Z"));

    const result = await billing.api.processRenewals({ customerId: "user_1" });

    expect(result.trialEnds).toHaveLength(1);
    expect(["canceled", "failed"]).toContain(result.trialEnds[0].status);
  });
});

describe("Feature access", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("grants access to plan features with active subscription", async () => {
    const { billing, payment } = createBilling();
    await subscribe(billing, payment, "pro");

    const exportAccess = await billing.api.checkFeature({
      customerId: "user_1",
      feature: "export",
    });
    const apiAccess = await billing.api.checkFeature({
      customerId: "user_1",
      feature: "api_access",
    });

    expect(exportAccess.allowed).toBe(true);
    expect(apiAccess.allowed).toBe(true);
  });

  it("denies access to features not in plan", async () => {
    const { billing, payment } = createBilling();
    await subscribe(billing, payment, "free");

    const result = await billing.api.checkFeature({
      customerId: "user_1",
      feature: "export",
    });

    expect(result.allowed).toBe(false);
  });

  it("denies access without subscription", async () => {
    const { billing } = createBilling();
    await billing.api.createCustomer({ externalId: "user_1", email: "u@t.com" });

    const result = await billing.api.checkFeature({
      customerId: "user_1",
      feature: "export",
    });

    expect(result.allowed).toBe(false);
  });

  it("denies access after immediate cancellation", async () => {
    const { billing, payment } = createBilling();
    await subscribe(billing, payment, "pro");

    await billing.api.cancelSubscription({
      customerId: "user_1",
      cancelAt: "immediately",
    });

    const result = await billing.api.checkFeature({
      customerId: "user_1",
      feature: "export",
    });

    expect(result.allowed).toBe(false);
  });

  it("grants access during trial", async () => {
    const { billing, payment } = createBilling();
    await subscribe(billing, payment, "trial-pro");

    const result = await billing.api.checkFeature({
      customerId: "user_1",
      feature: "export",
    });

    expect(result.allowed).toBe(true);
  });

  it("updates access after upgrade", async () => {
    const { billing, payment } = createBilling();
    await subscribe(billing, payment, "free");

    const before = await billing.api.checkFeature({
      customerId: "user_1",
      feature: "api_access",
    });
    expect(before.allowed).toBe(false);

    await billing.api.changeSubscription({
      customerId: "user_1",
      newPlanCode: "pro",
    });

    const after = await billing.api.checkFeature({
      customerId: "user_1",
      feature: "api_access",
    });
    expect(after.allowed).toBe(true);
  });
});
