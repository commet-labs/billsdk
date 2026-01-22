import { beforeEach, describe, expect, it } from "vitest";
import { memoryAdapter } from "./adapters/memory-adapter";
import { billsdk } from "./billsdk";

describe("BillSDK", () => {
  describe("Basic API", () => {
    let billing: ReturnType<typeof billsdk>;

    beforeEach(() => {
      billing = billsdk({
        database: memoryAdapter(),
        basePath: "/api/billing",
        logger: { disabled: true },
      });
    });

    it("should return health status", async () => {
      const result = await billing.api.health();

      expect(result.status).toBe("ok");
      expect(result.timestamp).toBeDefined();
    });

    it("should create a customer", async () => {
      const customer = await billing.api.createCustomer({
        externalId: "user_123",
        email: "test@example.com",
        name: "Test User",
      });

      expect(customer).toBeDefined();
      expect(customer.externalId).toBe("user_123");
      expect(customer.email).toBe("test@example.com");
    });

    it("should get a customer by external ID", async () => {
      await billing.api.createCustomer({
        externalId: "user_456",
        email: "test2@example.com",
      });

      const customer = await billing.api.getCustomer({
        externalId: "user_456",
      });

      expect(customer).toBeDefined();
      expect(customer?.externalId).toBe("user_456");
    });

    it("should return null for non-existent customer", async () => {
      const customer = await billing.api.getCustomer({
        externalId: "non_existent",
      });
      expect(customer).toBeNull();
    });

    it("should list plans (empty without configuration)", async () => {
      const plans = await billing.api.listPlans();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBe(0);
    });
  });

  describe("HTTP Handler", () => {
    let billing: ReturnType<typeof billsdk>;

    beforeEach(() => {
      billing = billsdk({
        database: memoryAdapter(),
        basePath: "/api/billing",
        logger: { disabled: true },
      });
    });

    it("should handle GET /health", async () => {
      const request = new Request("http://localhost/api/billing/health", {
        method: "GET",
      });

      const response = await billing.handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("ok");
    });

    it("should handle POST /customer", async () => {
      const request = new Request("http://localhost/api/billing/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalId: "user_http",
          email: "http@example.com",
        }),
      });

      const response = await billing.handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.customer.externalId).toBe("user_http");
    });

    it("should return 404 for unknown endpoint", async () => {
      const request = new Request("http://localhost/api/billing/unknown", {
        method: "GET",
      });

      const response = await billing.handler(request);
      expect(response.status).toBe(404);
    });

    it("should validate request body", async () => {
      const request = new Request("http://localhost/api/billing/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Missing required fields" }),
      });

      const response = await billing.handler(request);
      expect(response.status).toBe(400);
    });
  });

  describe("Config as Source of Truth", () => {
    it("should load plans from configuration", async () => {
      const billing = billsdk({
        database: memoryAdapter(),
        logger: { disabled: true },
        features: [
          { code: "export", name: "Export Data" },
          { code: "api_access", name: "API Access" },
        ],
        plans: [
          {
            code: "free",
            name: "Free",
            prices: [{ amount: 0, interval: "monthly" }],
            features: ["export"],
          },
          {
            code: "pro",
            name: "Pro",
            prices: [
              { amount: 2000, interval: "monthly" },
              { amount: 20000, interval: "yearly" },
            ],
            features: ["export", "api_access"],
          },
        ],
      });

      const plans = await billing.api.listPlans();

      expect(plans.length).toBe(2);
      expect(plans.find((p) => p.code === "free")).toBeDefined();
      expect(plans.find((p) => p.code === "pro")).toBeDefined();
    });

    it("should check feature access correctly", async () => {
      const billing = billsdk({
        database: memoryAdapter(),
        logger: { disabled: true },
        features: [
          { code: "export", name: "Export Data" },
          { code: "api_access", name: "API Access" },
        ],
        plans: [
          {
            code: "starter",
            name: "Starter",
            prices: [{ amount: 999, interval: "monthly" }],
            features: ["export"], // Only export, not api_access
          },
        ],
      });

      // Create customer
      await billing.api.createCustomer({
        externalId: "user_starter",
        email: "starter@example.com",
      });

      // Without subscription, no features
      const noSubResult = await billing.api.checkFeature({
        customerId: "user_starter",
        feature: "export",
      });
      expect(noSubResult.allowed).toBe(false);
    });

    it("should return same plans across multiple instances with same config", async () => {
      const config = {
        logger: { disabled: true },
        plans: [
          {
            code: "team",
            name: "Team",
            prices: [{ amount: 4999, interval: "monthly" as const }],
          },
        ],
      };

      // Different adapters, same config
      const billing1 = billsdk({ database: memoryAdapter(), ...config });
      const billing2 = billsdk({ database: memoryAdapter(), ...config });

      const plans1 = await billing1.api.listPlans();
      const plans2 = await billing2.api.listPlans();

      // Both return the same plans from config
      expect(plans1.length).toBe(1);
      expect(plans2.length).toBe(1);
      expect(plans1[0]?.code).toBe(plans2[0]?.code);
    });

    it("should support multiple price intervals", async () => {
      const billing = billsdk({
        database: memoryAdapter(),
        logger: { disabled: true },
        plans: [
          {
            code: "business",
            name: "Business",
            prices: [
              { amount: 4900, interval: "monthly" },
              { amount: 49000, interval: "yearly", trialDays: 14 },
            ],
          },
        ],
      });

      const plans = await billing.api.listPlans();
      expect(plans.length).toBe(1);

      // Get plan by code (not id - plans don't have IDs anymore)
      const plan = await billing.api.getPlan({ code: "business" });
      expect(plan).toBeDefined();
      expect(plan?.prices.length).toBe(2);
    });

    it("should include prices in plan response", async () => {
      const billing = billsdk({
        database: memoryAdapter(),
        logger: { disabled: true },
        plans: [
          {
            code: "pro",
            name: "Pro",
            prices: [
              { amount: 2900, interval: "monthly" },
              { amount: 29000, interval: "yearly" },
            ],
          },
        ],
      });

      const plan = await billing.api.getPlan({ code: "pro" });

      expect(plan).toBeDefined();
      expect(plan?.prices).toBeDefined();
      expect(plan?.prices.length).toBe(2);
      expect(plan?.prices.find((p) => p.interval === "monthly")?.amount).toBe(
        2900,
      );
      expect(plan?.prices.find((p) => p.interval === "yearly")?.amount).toBe(
        29000,
      );
    });
  });

  describe("Real-world Usage", () => {
    it("should support typical SaaS pricing structure", async () => {
      const billing = billsdk({
        database: memoryAdapter(),
        logger: { disabled: true },
        features: [
          { code: "projects", name: "Projects" },
          { code: "team_members", name: "Team Members" },
          { code: "api_access", name: "API Access" },
          { code: "sso", name: "Single Sign-On" },
          { code: "priority_support", name: "Priority Support" },
        ],
        plans: [
          {
            code: "free",
            name: "Free",
            description: "For individuals getting started",
            prices: [{ amount: 0, interval: "monthly" }],
            features: ["projects"],
          },
          {
            code: "pro",
            name: "Pro",
            description: "For growing teams",
            prices: [
              { amount: 2900, interval: "monthly" },
              { amount: 29000, interval: "yearly" },
            ],
            features: ["projects", "team_members", "api_access"],
          },
          {
            code: "enterprise",
            name: "Enterprise",
            description: "For large organizations",
            isPublic: false, // Hidden from public pricing page
            prices: [
              { amount: 9900, interval: "monthly" },
              { amount: 99000, interval: "yearly" },
            ],
            features: [
              "projects",
              "team_members",
              "api_access",
              "sso",
              "priority_support",
            ],
          },
        ],
      });

      // Public plans only
      const publicPlans = await billing.api.listPlans();
      expect(publicPlans.length).toBe(2);
      expect(publicPlans.find((p) => p.code === "enterprise")).toBeUndefined();

      // Create a customer
      const customer = await billing.api.createCustomer({
        externalId: "acme_corp",
        email: "billing@acme.com",
        name: "ACME Corporation",
      });

      expect(customer.externalId).toBe("acme_corp");
    });
  });
});
