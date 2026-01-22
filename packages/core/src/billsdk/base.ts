import { createRouter } from "../api";
import type { BillingContext } from "../context/create-context";
import type { BillSDK, InferredAPI } from "../types/billsdk";
import type { BillSDKOptions } from "../types/options";

/**
 * Base error codes for BillSDK
 */
const BASE_ERROR_CODES = {
  CUSTOMER_NOT_FOUND: "CUSTOMER_NOT_FOUND",
  PLAN_NOT_FOUND: "PLAN_NOT_FOUND",
  SUBSCRIPTION_NOT_FOUND: "SUBSCRIPTION_NOT_FOUND",
  FEATURE_NOT_FOUND: "FEATURE_NOT_FOUND",
  PAYMENT_ADAPTER_NOT_CONFIGURED: "PAYMENT_ADAPTER_NOT_CONFIGURED",
  INVALID_REQUEST: "INVALID_REQUEST",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

/**
 * Create the API object for direct server-side access
 */
function createAPI(contextPromise: Promise<BillingContext>): InferredAPI {
  return {
    async getCustomer(params) {
      const ctx = await contextPromise;
      return ctx.internalAdapter.findCustomerByExternalId(params.externalId);
    },

    async createCustomer(data) {
      const ctx = await contextPromise;
      return ctx.internalAdapter.createCustomer(data);
    },

    async listPlans() {
      const ctx = await contextPromise;
      return ctx.internalAdapter.listPlans();
    },

    async getPlan(params) {
      const ctx = await contextPromise;
      return ctx.internalAdapter.findPlanById(params.id);
    },

    async getSubscription(params) {
      const ctx = await contextPromise;
      const customer = await ctx.internalAdapter.findCustomerByExternalId(params.customerId);
      if (!customer) return null;
      return ctx.internalAdapter.findSubscriptionByCustomerId(customer.id);
    },

    async createSubscription(params) {
      const ctx = await contextPromise;

      if (!ctx.paymentAdapter) {
        throw new Error("Payment adapter not configured");
      }

      // Find customer
      const customer = await ctx.internalAdapter.findCustomerByExternalId(params.customerId);
      if (!customer) {
        throw new Error("Customer not found");
      }

      // Find plan
      const plan = await ctx.internalAdapter.findPlanByCode(params.planCode);
      if (!plan) {
        throw new Error("Plan not found");
      }

      // Find price
      const price = await ctx.internalAdapter.findDefaultPlanPrice(plan.id, params.interval ?? "monthly");
      if (!price) {
        throw new Error(`No price found for plan ${params.planCode}`);
      }

      // Create subscription
      const subscription = await ctx.internalAdapter.createSubscription({
        customerId: customer.id,
        planId: plan.id,
        priceId: price.id,
        status: "pending_payment",
      });

      // Create checkout session
      const checkoutResult = await ctx.paymentAdapter.createCheckoutSession({
        customer: {
          id: customer.id,
          email: customer.email,
          providerCustomerId: customer.providerCustomerId,
        },
        plan: { id: plan.id, name: plan.name },
        price: { amount: price.amount, currency: price.currency, interval: price.interval },
        subscription: { id: subscription.id },
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        metadata: { subscriptionId: subscription.id },
      });

      // Update subscription with checkout session ID
      await ctx.internalAdapter.updateSubscription(subscription.id, {
        providerCheckoutSessionId: checkoutResult.sessionId,
      });

      return {
        subscription,
        checkoutUrl: checkoutResult.url,
      };
    },

    async checkFeature(params) {
      const ctx = await contextPromise;
      return ctx.internalAdapter.checkFeatureAccess(params.customerId, params.feature);
    },

    async listFeatures(params) {
      const ctx = await contextPromise;
      const customer = await ctx.internalAdapter.findCustomerByExternalId(params.customerId);
      if (!customer) return [];

      const subscription = await ctx.internalAdapter.findSubscriptionByCustomerId(customer.id);
      if (!subscription) return [];

      return ctx.internalAdapter.listPlanFeatures(subscription.planId);
    },

    async health() {
      return {
        status: "ok" as const,
        timestamp: new Date().toISOString(),
      };
    },
  };
}

/**
 * Create a BillSDK instance
 *
 * @param options - Configuration options
 * @param initFn - Initialization function that creates the context
 * @returns BillSDK instance
 */
export function createBillSDK<Options extends BillSDKOptions>(
  options: Options,
  initFn: (options: Options) => Promise<BillingContext>,
): BillSDK<Options> {
  // Lazy initialization - context is created only when needed
  const contextPromise = initFn(options);

  // Collect error codes from plugins
  const errorCodes: Record<string, string> = {};
  for (const plugin of options.plugins ?? []) {
    if (plugin.$ERROR_CODES) {
      Object.assign(errorCodes, plugin.$ERROR_CODES);
    }
  }

  // Create the request handler
  const handler = async (request: Request): Promise<Response> => {
    const ctx = await contextPromise;
    const { handler: routeHandler } = createRouter(ctx);
    return routeHandler(request);
  };

  // Create the API object
  const api = createAPI(contextPromise);

  return {
    handler,
    api,
    options,
    $context: contextPromise,
    $Infer: {} as BillSDK<Options>["$Infer"],
    $ERROR_CODES: {
      ...BASE_ERROR_CODES,
      ...errorCodes,
    } as BillSDK<Options>["$ERROR_CODES"],
  };
}
