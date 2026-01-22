import { describe, it, expect, beforeEach } from "vitest";
import { billsdk } from "./billsdk";
import { memoryAdapter } from "./adapters/memory-adapter";
import type { BillingContext } from "./context/create-context";

describe("BillSDK Core", () => {
  let billing: ReturnType<typeof billsdk>;

  beforeEach(() => {
    billing = billsdk({
      database: memoryAdapter(),
      basePath: "/api/billing",
      logger: { disabled: true },
    });
  });

  describe("API - Health", () => {
    it("should return health status", async () => {
      const result = await billing.api.health();

      expect(result.status).toBe("ok");
      expect(result.timestamp).toBeDefined();
    });
  });

  describe("API - Customers", () => {
    it("should create a customer", async () => {
      const customer = await billing.api.createCustomer({
        externalId: "user_123",
        email: "test@example.com",
        name: "Test User",
      });

      expect(customer).toBeDefined();
      expect(customer.externalId).toBe("user_123");
      expect(customer.email).toBe("test@example.com");
      expect(customer.name).toBe("Test User");
    });

    it("should get a customer by external ID", async () => {
      await billing.api.createCustomer({
        externalId: "user_456",
        email: "test2@example.com",
      });

      const customer = await billing.api.getCustomer({ externalId: "user_456" });

      expect(customer).toBeDefined();
      expect(customer?.externalId).toBe("user_456");
    });

    it("should return null for non-existent customer", async () => {
      const customer = await billing.api.getCustomer({ externalId: "non_existent" });

      expect(customer).toBeNull();
    });
  });

  describe("API - Plans", () => {
    it("should list plans (empty initially)", async () => {
      const plans = await billing.api.listPlans();

      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBe(0);
    });
  });

  describe("HTTP Handler", () => {
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
          name: "HTTP User",
        }),
      });

      const response = await billing.handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.customer).toBeDefined();
      expect(data.customer.externalId).toBe("user_http");
    });

    it("should handle GET /customer", async () => {
      // First create a customer
      const createRequest = new Request("http://localhost/api/billing/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalId: "user_get",
          email: "get@example.com",
        }),
      });
      await billing.handler(createRequest);

      // Then get the customer
      const getRequest = new Request(
        "http://localhost/api/billing/customer?externalId=user_get",
        { method: "GET" },
      );

      const response = await billing.handler(getRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.customer).toBeDefined();
      expect(data.customer.externalId).toBe("user_get");
    });

    it("should return 404 for unknown endpoint", async () => {
      const request = new Request("http://localhost/api/billing/unknown", {
        method: "GET",
      });

      const response = await billing.handler(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBeDefined();
    });

    it("should validate request body", async () => {
      const request = new Request("http://localhost/api/billing/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing required fields
          name: "Invalid User",
        }),
      });

      const response = await billing.handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe("Features", () => {
    it("should check feature access (false when no subscription)", async () => {
      // Create customer
      await billing.api.createCustomer({
        externalId: "user_feature",
        email: "feature@example.com",
      });

      const result = await billing.api.checkFeature({
        customerId: "user_feature",
        feature: "export",
      });

      expect(result.allowed).toBe(false);
    });

    it("should list features (empty when no subscription)", async () => {
      await billing.api.createCustomer({
        externalId: "user_list_features",
        email: "listfeatures@example.com",
      });

      const features = await billing.api.listFeatures({
        customerId: "user_list_features",
      });

      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBe(0);
    });
  });
});

describe("Internal Adapter", () => {
  let ctx: BillingContext;

  beforeEach(async () => {
    const billing = billsdk({
      database: memoryAdapter(),
      logger: { disabled: true },
    });
    ctx = await billing.$context;
  });

  describe("Plans and Prices", () => {
    it("should create a plan", async () => {
      const plan = await ctx.internalAdapter.createPlan({
        code: "pro",
        name: "Pro Plan",
        description: "Professional plan with all features",
      });

      expect(plan).toBeDefined();
      expect(plan.code).toBe("pro");
      expect(plan.isPublic).toBe(true);
    });

    it("should create a plan price", async () => {
      const plan = await ctx.internalAdapter.createPlan({
        code: "starter",
        name: "Starter Plan",
      });

      const price = await ctx.internalAdapter.createPlanPrice({
        planId: plan.id,
        amount: 1999, // $19.99
        currency: "usd",
        interval: "monthly",
        isDefault: true,
      });

      expect(price).toBeDefined();
      expect(price.amount).toBe(1999);
      expect(price.interval).toBe("monthly");
    });

    it("should find default price for plan", async () => {
      const plan = await ctx.internalAdapter.createPlan({
        code: "team",
        name: "Team Plan",
      });

      await ctx.internalAdapter.createPlanPrice({
        planId: plan.id,
        amount: 4999,
        currency: "usd",
        interval: "monthly",
        isDefault: true,
      });

      await ctx.internalAdapter.createPlanPrice({
        planId: plan.id,
        amount: 49999,
        currency: "usd",
        interval: "yearly",
        isDefault: true,
      });

      const monthlyPrice = await ctx.internalAdapter.findDefaultPlanPrice(
        plan.id,
        "monthly",
      );
      expect(monthlyPrice?.amount).toBe(4999);

      const yearlyPrice = await ctx.internalAdapter.findDefaultPlanPrice(
        plan.id,
        "yearly",
      );
      expect(yearlyPrice?.amount).toBe(49999);
    });
  });

  describe("Features and Plan Features", () => {
    it("should create a feature", async () => {
      const feature = await ctx.internalAdapter.createFeature({
        code: "api_access",
        name: "API Access",
        type: "boolean",
      });

      expect(feature).toBeDefined();
      expect(feature.code).toBe("api_access");
      expect(feature.type).toBe("boolean");
    });

    it("should create a plan feature", async () => {
      const plan = await ctx.internalAdapter.createPlan({
        code: "enterprise",
        name: "Enterprise",
      });

      const planFeature = await ctx.internalAdapter.createPlanFeature({
        planId: plan.id,
        featureCode: "sso",
        enabled: true,
      });

      expect(planFeature).toBeDefined();
      expect(planFeature.enabled).toBe(true);
    });

    it("should check feature access with subscription", async () => {
      // Create plan with feature
      const plan = await ctx.internalAdapter.createPlan({
        code: "premium",
        name: "Premium",
      });

      const price = await ctx.internalAdapter.createPlanPrice({
        planId: plan.id,
        amount: 2999,
        currency: "usd",
        interval: "monthly",
        isDefault: true,
      });

      await ctx.internalAdapter.createPlanFeature({
        planId: plan.id,
        featureCode: "export",
        enabled: true,
      });

      // Create customer with subscription
      const customer = await ctx.internalAdapter.createCustomer({
        externalId: "user_premium",
        email: "premium@example.com",
      });

      await ctx.internalAdapter.createSubscription({
        customerId: customer.id,
        planId: plan.id,
        priceId: price.id,
        status: "active",
      });

      // Check feature access
      const result = await ctx.internalAdapter.checkFeatureAccess(
        "user_premium",
        "export",
      );

      expect(result.allowed).toBe(true);
    });

    it("should return false for disabled feature", async () => {
      const plan = await ctx.internalAdapter.createPlan({
        code: "basic",
        name: "Basic",
      });

      const price = await ctx.internalAdapter.createPlanPrice({
        planId: plan.id,
        amount: 999,
        currency: "usd",
        interval: "monthly",
        isDefault: true,
      });

      await ctx.internalAdapter.createPlanFeature({
        planId: plan.id,
        featureCode: "advanced_analytics",
        enabled: false,
      });

      const customer = await ctx.internalAdapter.createCustomer({
        externalId: "user_basic",
        email: "basic@example.com",
      });

      await ctx.internalAdapter.createSubscription({
        customerId: customer.id,
        planId: plan.id,
        priceId: price.id,
        status: "active",
      });

      const result = await ctx.internalAdapter.checkFeatureAccess(
        "user_basic",
        "advanced_analytics",
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe("Subscriptions", () => {
    it("should create a subscription", async () => {
      const plan = await ctx.internalAdapter.createPlan({
        code: "test",
        name: "Test Plan",
      });

      const price = await ctx.internalAdapter.createPlanPrice({
        planId: plan.id,
        amount: 1000,
        currency: "usd",
        interval: "monthly",
      });

      const customer = await ctx.internalAdapter.createCustomer({
        externalId: "sub_user",
        email: "sub@example.com",
      });

      const subscription = await ctx.internalAdapter.createSubscription({
        customerId: customer.id,
        planId: plan.id,
        priceId: price.id,
      });

      expect(subscription).toBeDefined();
      expect(subscription.status).toBe("pending_payment");
    });

    it("should find subscription by checkout session ID", async () => {
      const plan = await ctx.internalAdapter.createPlan({
        code: "checkout_test",
        name: "Checkout Test",
      });

      const price = await ctx.internalAdapter.createPlanPrice({
        planId: plan.id,
        amount: 2000,
        currency: "usd",
        interval: "monthly",
      });

      const customer = await ctx.internalAdapter.createCustomer({
        externalId: "checkout_user",
        email: "checkout@example.com",
      });

      const subscription = await ctx.internalAdapter.createSubscription({
        customerId: customer.id,
        planId: plan.id,
        priceId: price.id,
        providerCheckoutSessionId: "cs_test_123",
      });

      const found = await ctx.internalAdapter.findSubscriptionByProviderSessionId(
        "cs_test_123",
      );

      expect(found).toBeDefined();
      expect(found?.id).toBe(subscription.id);
    });
  });
});
