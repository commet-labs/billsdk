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
