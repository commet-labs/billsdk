// BillSDK - The billing SDK for SaaS applications

// Re-export types (already exported from @billsdk/core, but explicit for clarity)
export type {
  BillingInterval,
  BillSDK,
  BillSDKOptions,
  ConfirmResult,
  Customer,
  DBAdapter,
  ExtractFeatureCodes,
  Feature,
  FeatureConfig,
  PaymentAdapter,
  PaymentParams,
  PaymentResult,
  PaymentResultActive,
  PaymentResultFailed,
  PaymentResultPending,
  Plan,
  PlanConfig,
  PlanFeature,
  PlanPrice,
  PlanPriceConfig,
  SortBy,
  SortDirection,
  Subscription,
  SubscriptionStatus,
  Where,
  WhereOperator,
} from "@billsdk/core";
// Re-export everything from @billsdk/core for convenience
export * from "@billsdk/core";

// Built-in adapters
export { memoryAdapter } from "./adapters/memory-adapter";
// Main factory
export { billsdk } from "./billsdk";
