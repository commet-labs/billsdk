import { memoryAdapter } from "../adapters/memory-adapter";
import { paymentAdapter } from "../adapters/payment";
import { createRouter } from "../api";
import {
  type BillingContext,
  createBillingContext,
} from "../context/create-context";
import type { BillSDK, InferredAPI } from "../types/billsdk";
import type { BillSDKOptions, FeatureConfig } from "../types/options";

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
 * The generic is for type inference only - runtime behavior is the same
 */
function createAPI<TFeatureCode extends string = string>(
  contextPromise: Promise<BillingContext>,
): InferredAPI<TFeatureCode> {
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
      // Plans come from config, synchronous
      return ctx.internalAdapter.listPlans();
    },

    async getPlan(params) {
      const ctx = await contextPromise;
      // Plans come from config, synchronous
      return ctx.internalAdapter.findPlanByCode(params.code);
    },

    async getSubscription(params) {
      const ctx = await contextPromise;
      const customer = await ctx.internalAdapter.findCustomerByExternalId(
        params.customerId,
      );
      if (!customer) return null;
      return ctx.internalAdapter.findSubscriptionByCustomerId(customer.id);
    },

    async createSubscription(params) {
      const ctx = await contextPromise;

      if (!ctx.paymentAdapter) {
        throw new Error("Payment adapter not configured");
      }

      // Find customer
      const customer = await ctx.internalAdapter.findCustomerByExternalId(
        params.customerId,
      );
      if (!customer) {
        throw new Error("Customer not found");
      }

      // Find plan (from config, synchronous)
      const plan = ctx.internalAdapter.findPlanByCode(params.planCode);
      if (!plan) {
        throw new Error("Plan not found");
      }

      // Find price for interval
      const interval = params.interval ?? "monthly";
      const price = ctx.internalAdapter.getPlanPrice(params.planCode, interval);
      if (!price) {
        throw new Error(
          `No price found for plan ${params.planCode} with interval ${interval}`,
        );
      }

      // Create subscription (using planCode, not planId)
      const subscription = await ctx.internalAdapter.createSubscription({
        customerId: customer.id,
        planCode: params.planCode,
        interval,
        status: "pending_payment",
        trialDays: price.trialDays,
      });

      // Create checkout session
      const checkoutResult = await ctx.paymentAdapter.createCheckoutSession({
        customer: {
          id: customer.id,
          email: customer.email,
          providerCustomerId: customer.providerCustomerId,
        },
        plan: { code: plan.code, name: plan.name },
        price: {
          amount: price.amount,
          currency: price.currency,
          interval: price.interval,
        },
        subscription: { id: subscription.id },
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        metadata: { subscriptionId: subscription.id },
      });

      // Update subscription with checkout session ID and provider customer ID
      await ctx.internalAdapter.updateSubscription(subscription.id, {
        providerCheckoutSessionId: checkoutResult.sessionId,
      });

      // Update customer with provider ID if new
      if (checkoutResult.providerCustomerId && !customer.providerCustomerId) {
        await ctx.internalAdapter.updateCustomer(customer.id, {
          providerCustomerId: checkoutResult.providerCustomerId,
        });
      }

      return {
        subscription,
        checkoutUrl: checkoutResult.url,
      };
    },

    async cancelSubscription(params) {
      const ctx = await contextPromise;
      const customer = await ctx.internalAdapter.findCustomerByExternalId(
        params.customerId,
      );
      if (!customer) {
        return null;
      }

      const subscription =
        await ctx.internalAdapter.findSubscriptionByCustomerId(customer.id);
      if (!subscription) {
        return null;
      }

      const cancelAt = params.cancelAt ?? "period_end";

      if (cancelAt === "immediately") {
        // Cancel immediately
        return ctx.internalAdapter.cancelSubscription(subscription.id);
      }

      // Cancel at period end - set cancelAt date but keep active
      return ctx.internalAdapter.cancelSubscription(
        subscription.id,
        subscription.currentPeriodEnd,
      );
    },

    async checkFeature(params) {
      const ctx = await contextPromise;
      return ctx.internalAdapter.checkFeatureAccess(
        params.customerId,
        params.feature,
      );
    },

    async listFeatures(params) {
      const ctx = await contextPromise;
      const customer = await ctx.internalAdapter.findCustomerByExternalId(
        params.customerId,
      );
      if (!customer) return [];

      const subscription =
        await ctx.internalAdapter.findSubscriptionByCustomerId(customer.id);
      if (!subscription) return [];

      // Get features from config (synchronous)
      const featureCodes = ctx.internalAdapter.getPlanFeatures(
        subscription.planCode,
      );
      return featureCodes.map((code) => {
        const feature = ctx.internalAdapter.findFeatureByCode(code);
        return feature
          ? {
              code: feature.code as TFeatureCode,
              name: feature.name,
              enabled: true as const,
            }
          : { code: code as TFeatureCode, name: code, enabled: true as const };
      });
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
 * Initialize the billing context
 */
async function init(options: BillSDKOptions): Promise<BillingContext> {
  const database = options.database ?? memoryAdapter();
  const payment = options.payment ?? paymentAdapter();
  return createBillingContext(database, { ...options, payment });
}

/**
 * Create a BillSDK instance
 *
 * @param options - Configuration options
 * @returns BillSDK instance
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint flexibility for readonly/mutable arrays
export function createBillSDK<Options extends BillSDKOptions<any>>(
  options: Options,
): BillSDK<Options> {
  // Lazy initialization - context is created only when needed
  const contextPromise = init(options);

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
  // Type assertion needed because runtime uses string but we want type inference
  const api = createAPI(contextPromise) as BillSDK<Options>["api"];

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

/**
 * Create a BillSDK instance
 *
 * @example
 * ```typescript
 * import { billsdk } from "@billsdk/core";
 *
 * export const billing = billsdk({
 *   basePath: "/api/billing",
 *   features: [
 *     { code: "export", name: "Export" },
 *   ],
 *   plans: [
 *     { code: "pro", features: ["export"] }, // Validated!
 *   ],
 * });
 * ```
 */
export function billsdk<
  const TFeatures extends readonly FeatureConfig<string>[],
>(options: BillSDKOptions<TFeatures>): BillSDK<BillSDKOptions<TFeatures>> {
  // biome-ignore lint/suspicious/noExplicitAny: Type coercion needed for generic constraint compatibility
  return createBillSDK(options as any);
}
