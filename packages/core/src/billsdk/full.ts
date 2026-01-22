import { init } from "../context/init";
import type { BillSDK } from "../types/billsdk";
import type { BillSDKOptions } from "../types/options";
import { createBillSDK } from "./base";

/**
 * Create a BillSDK instance
 *
 * @example
 * ```typescript
 * import { billsdk } from "@billsdk/core";
 * import { memoryAdapter } from "@billsdk/core/adapters/memory";
 *
 * export const billing = billsdk({
 *   database: memoryAdapter(),
 *   basePath: "/api/billing",
 * });
 *
 * // Mount in Next.js
 * export const { GET, POST } = billing.handler;
 *
 * // Direct API access
 * const plans = await billing.api.listPlans();
 * ```
 */
export function billsdk<Options extends BillSDKOptions>(options: Options): BillSDK<Options> {
  return createBillSDK(options, init);
}

export default billsdk;
