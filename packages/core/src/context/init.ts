import { memoryAdapter } from "../adapters/memory-adapter";
import type { BillSDKOptions } from "../types/options";
import { type BillingContext, createBillingContext } from "./create-context";

/**
 * Initialize the billing context
 * This is the main entry point for context creation
 */
export async function init(options: BillSDKOptions): Promise<BillingContext> {
  // Get or create adapter
  const adapter = options.database ?? memoryAdapter();

  // Create and return context
  return createBillingContext(adapter, options);
}
