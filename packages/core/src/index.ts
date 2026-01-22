// BillSDK Core - The billing engine for SaaS applications

// Main factory - the only way to create a billing instance
export { billsdk, default } from "./billsdk";

// Adapters
export { memoryAdapter } from "./adapters/memory-adapter";

// Types - only what users need
export type {
  // Main types
  BillSDK,
  BillSDKOptions,
  PlanConfig,
  PlanPriceConfig,
  FeatureConfig,
  // Model types for type inference
  Customer,
  Plan,
  PlanPrice,
  Subscription,
  Feature,
  PlanFeature,
  BillingInterval,
  SubscriptionStatus,
  // Adapter interface for custom adapters
  DBAdapter,
  Where,
  SortBy,
  WhereOperator,
  SortDirection,
  // Payment adapter interface
  PaymentAdapter,
  CheckoutResult,
  WebhookResult,
} from "./types";
