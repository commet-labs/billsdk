import { init } from "../context/init";
import type { BillSDK } from "../types/billsdk";
import type { BillSDKOptions, FeatureConfig } from "../types/options";
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
  return createBillSDK(options as any, init) as any;
}

export default billsdk;
