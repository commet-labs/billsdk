import type {
  Customer,
  Feature,
  Payment,
  Plan,
  PlanPrice,
  Subscription,
} from "./models";
import type {
  BillSDKOptions,
  ExtractFeatureCodes,
  FeatureConfig,
} from "./options";

/**
 * Feature access info returned by listFeatures
 */
export interface FeatureAccess<TFeatureCode extends string = string> {
  code: TFeatureCode;
  name: string;
  enabled: boolean;
}

/**
 * Inferred API type from endpoints
 * @typeParam TFeatureCode - Union of valid feature codes from config
 */
export interface InferredAPI<TFeatureCode extends string = string> {
  // Customer endpoints
  getCustomer: (params: { externalId: string }) => Promise<Customer | null>;
  createCustomer: (data: {
    externalId: string;
    email: string;
    name?: string;
  }) => Promise<Customer>;

  // Plan endpoints (from config, not DB)
  listPlans: () => Promise<Plan[]>;
  getPlan: (params: { code: string }) => Promise<Plan | null>;

  // Subscription endpoints
  getSubscription: (params: {
    customerId: string;
  }) => Promise<Subscription | null>;
  /**
   * Create a subscription for a customer
   *
   * The payment adapter decides the flow:
   * - If payment completes immediately: returns { subscription } with status "active"
   * - If payment requires redirect: returns { subscription, redirectUrl } with status "pending_payment"
   *
   * successUrl and cancelUrl are only required if the payment adapter needs them (e.g., Stripe)
   */
  createSubscription: (params: {
    customerId: string;
    planCode: string;
    interval?: "monthly" | "yearly";
    successUrl?: string;
    cancelUrl?: string;
  }) => Promise<{ subscription: Subscription; redirectUrl?: string }>;
  cancelSubscription: (params: {
    customerId: string;
    cancelAt?: "period_end" | "immediately";
  }) => Promise<Subscription | null>;

  // Feature endpoints
  checkFeature: (params: {
    customerId: string;
    feature: TFeatureCode;
  }) => Promise<{ allowed: boolean }>;
  listFeatures: (params: {
    customerId: string;
  }) => Promise<FeatureAccess<TFeatureCode>[]>;

  // Payment endpoints
  listPayments: (params: {
    customerId: string;
    limit?: number;
    offset?: number;
  }) => Promise<Payment[]>;
  getPayment: (params: { paymentId: string }) => Promise<Payment | null>;

  // Health check
  health: () => Promise<{ status: "ok"; timestamp: string }>;
}

/**
 * Helper to extract feature codes from BillSDKOptions
 */

// biome-ignore lint/suspicious/noExplicitAny: Generic constraint needs flexibility for readonly/mutable arrays
type ExtractFeatureCodesFromOptions<Options extends BillSDKOptions<any>> =
  Options extends BillSDKOptions<infer TFeatures>
    ? TFeatures extends readonly FeatureConfig<string>[]
      ? ExtractFeatureCodes<TFeatures>
      : string
    : string;

/**
 * The main BillSDK instance type
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic constraint needs flexibility for readonly/mutable arrays
export interface BillSDK<Options extends BillSDKOptions<any> = BillSDKOptions> {
  /**
   * Request handler for mounting to a framework
   * Compatible with Web Standard Request/Response
   */
  handler: (request: Request) => Promise<Response>;

  /**
   * Direct API access for server-side usage
   * Features are type-safe based on your config
   */
  api: InferredAPI<ExtractFeatureCodesFromOptions<Options>>;

  /**
   * Original options
   */
  options: Options;

  /**
   * Internal context (Promise for lazy initialization)
   * The actual type is BillingContext from billsdk package
   */
  // biome-ignore lint/suspicious/noExplicitAny: Internal context type varies by implementation
  $context: Promise<any>;

  /**
   * Type inference helpers
   */
  $Infer: {
    Customer: Customer;
    Plan: Plan;
    PlanPrice: PlanPrice;
    Subscription: Subscription;
    Feature: Feature;
    Payment: Payment;
  };

  /**
   * Error codes
   */
  $ERROR_CODES: {
    CUSTOMER_NOT_FOUND: "CUSTOMER_NOT_FOUND";
    PLAN_NOT_FOUND: "PLAN_NOT_FOUND";
    SUBSCRIPTION_NOT_FOUND: "SUBSCRIPTION_NOT_FOUND";
    FEATURE_NOT_FOUND: "FEATURE_NOT_FOUND";
    PAYMENT_ADAPTER_NOT_CONFIGURED: "PAYMENT_ADAPTER_NOT_CONFIGURED";
    INVALID_REQUEST: "INVALID_REQUEST";
    INTERNAL_ERROR: "INTERNAL_ERROR";
  };
}
