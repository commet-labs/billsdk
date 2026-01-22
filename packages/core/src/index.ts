// BillSDK Core - The billing engine for SaaS applications

// Adapters
export { memoryAdapter } from "./adapters/memory-adapter";
// Main factory - the only way to create a billing instance
export { billsdk } from "./billsdk";

// Types - only what users need
export type {
  BillingInterval,
  // Main types
  BillSDK,
  BillSDKOptions,
  CheckoutResult,
  // Model types for type inference
  Customer,
  // Adapter interface for custom adapters
  DBAdapter,
  ExtractFeatureCodes,
  Feature,
  FeatureConfig,
  // Payment adapter interface
  PaymentAdapter,
  Plan,
  PlanConfig,
  PlanFeature,
  PlanPrice,
  PlanPriceConfig,
  SortBy,
  SortDirection,
  Subscription,
  SubscriptionStatus,
  WebhookResult,
  Where,
  WhereOperator,
} from "./types";
