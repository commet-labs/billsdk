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
export * from "@billsdk/core";
export {
  type DrizzleAdapterConfig,
  type DrizzleDB,
  drizzleAdapter,
} from "@billsdk/drizzle-adapter";
export { memoryAdapter } from "@billsdk/memory-adapter";
export { paymentAdapter } from "@billsdk/payment-adapter";

// Main factory
export { billsdk } from "./billsdk";
