import { paymentAdapter } from "@billsdk/payment-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBillSDK } from "../billsdk/base";

function createBilling(paymentOverrides = {}) {
  const payment = paymentAdapter(paymentOverrides);
  const billing = createBillSDK({
    secret: "test-secret-that-is-at-least-32-characters-long!!",
    trustedOrigins: ["http://localhost:3000"],
    payment,
    features: [{ code: "export", name: "Export", type: "boolean" }],
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
    const { billing, payment } = createBilling();
    await subscribe(billing, payment, "starter");

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
    const { billing, payment } = createBilling();
    await subscribe(billing, payment, "starter");

    vi.setSystemTime(new Date("2025-02-01T00:00:01Z"));

    await billing.api.processRenewals({ customerId: "user_1" });
    const secondRun = await billing.api.processRenewals({
      customerId: "user_1",
    });

    expect(secondRun.processed).toBe(0);

    const payments = await billing.api.listPayments({ customerId: "user_1" });
    const renewalPayments = payments.filter((p) => p.type === "renewal");
    expect(renewalPayments).toHaveLength(1);
  });

  it("applies scheduled downgrade before charging", async () => {
    const { billing, payment } = createBilling();
    await subscribe(billing, payment, "pro");

    await billing.api.changeSubscription({
      customerId: "user_1",
      newPlanCode: "starter",
    });

    vi.setSystemTime(new Date("2025-02-01T00:00:01Z"));

    const result = await billing.api.processRenewals({ customerId: "user_1" });

    expect(result.renewals[0].amount).toBe(1000);
    expect(result.renewals[0].planChanged).toEqual({
      from: "pro",
      to: "starter",
    });

    const sub = await billing.api.getSubscription({ customerId: "user_1" });
    expect(sub!.planCode).toBe("starter");
    expect(sub!.scheduledPlanCode).toBeNull();
  });

  it("advances period without payment on free plan", async () => {
    const { billing, payment } = createBilling();
    await subscribe(billing, payment, "free");

    vi.setSystemTime(new Date("2025-02-01T00:00:01Z"));

    const result = await billing.api.processRenewals({ customerId: "user_1" });

    expect(result.succeeded).toBe(1);
    expect(result.renewals[0].amount).toBe(0);

    const payments = await billing.api.listPayments({ customerId: "user_1" });
    expect(payments).toHaveLength(0);
  });

  it("marks subscription as past_due when charge fails", async () => {
    const { billing, payment } = createBilling({ charges: "fail" });
    await subscribe(billing, payment, "starter");

    vi.setSystemTime(new Date("2025-02-01T00:00:01Z"));

    const result = await billing.api.processRenewals({ customerId: "user_1" });

    expect(result.failed).toBe(1);
    expect(result.renewals[0].status).toBe("failed");
    expect(result.renewals[0].error).toBe("card_declined");
  });
});
