/**
 * BillSDK Next.js integration
 *
 * @example
 * ```typescript
 * // app/api/billing/[...all]/route.ts
 * import { billingHandler } from "@billsdk/next";
 * import { billing } from "@/lib/billing";
 *
 * export const { GET, POST } = billingHandler(billing);
 * ```
 */

type BillingInstance =
  | {
      handler: (request: Request) => Promise<Response>;
    }
  | ((request: Request) => Promise<Response>);

/**
 * Create Next.js route handlers for BillSDK
 *
 * @param billing - The billing instance from billsdk()
 * @returns Object with GET and POST handlers for Next.js App Router
 */
export function billingHandler(billing: BillingInstance) {
  const handler = async (request: Request) => {
    return "handler" in billing ? billing.handler(request) : billing(request);
  };

  return {
    GET: handler,
    POST: handler,
  };
}

/**
 * Alias for billingHandler (matches better-auth naming)
 */
export const toNextJsHandler = billingHandler;
