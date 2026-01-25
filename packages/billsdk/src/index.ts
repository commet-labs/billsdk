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

// Re-export adapters for convenience (actual implementations are in separate packages)
export { memoryAdapter } from "@billsdk/memory-adapter";
export {
  drizzleAdapter,
  type DrizzleAdapterConfig,
  type DrizzleDB,
} from "@billsdk/drizzle-adapter";
export { paymentAdapter } from "@billsdk/payment-adapter";

// Main factory
export { billsdk } from "./billsdk";
