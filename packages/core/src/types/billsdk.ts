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

  /**
   * Change a subscription to a different plan
   *
   * Automatically calculates proration (credit for unused time,
   * charge for new plan's remaining time).
   */
  changeSubscription: (params: {
    customerId: string;
    newPlanCode: string;
    /** Whether to calculate proration. Defaults to true. */
    prorate?: boolean;
  }) => Promise<{
    subscription: Subscription | null;
    previousPlan: Plan | null;
    newPlan: Plan;
    payment: Payment | null;
  }>;

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

  /**
   * Create a refund for a payment
   *
   * @param paymentId - The BillSDK payment ID to refund
   * @param amount - Optional amount to refund (partial refund). If omitted, full refund is issued.
   * @param reason - Optional reason for the refund
   */
  createRefund: (params: {
    paymentId: string;
    amount?: number;
    reason?: string;
  }) => Promise<{
    refund: Payment;
    originalPayment: Payment;
  }>;

  // Health check
  health: () => Promise<{ status: "ok"; timestamp: string }>;

  // Renewals
  /**
   * Process all due subscription renewals
   *
   * This function:
   * 1. Finds all subscriptions where currentPeriodEnd <= now
   * 2. Applies any scheduled plan changes (downgrades)
   * 3. Charges the customer for the new period
   * 4. Updates the subscription period dates
   * 5. Creates payment records
   *
   * Idempotent: Running twice won't double-charge because period dates are updated.
   *
   * @example
   * ```typescript
   * // From a cron job
   * const result = await billing.api.processRenewals();
   *
   * // Dry run (no charges)
   * const result = await billing.api.processRenewals({ dryRun: true });
   *
   * // Single customer (for testing)
   * const result = await billing.api.processRenewals({ customerId: "user_123" });
   * ```
   */
  processRenewals: (params?: {
    /** Process only a specific customer (useful for testing) */
    customerId?: string;
    /** Dry run - don't actually charge, just report what would happen */
    dryRun?: boolean;
    /** Maximum number of subscriptions to process (for batching) */
    limit?: number;
  }) => Promise<{
    /** Total subscriptions processed */
    processed: number;
    /** Successful renewals */
    succeeded: number;
    /** Failed renewals */
    failed: number;
    /** Skipped (already renewed, etc.) */
    skipped: number;
    /** Details for each renewal */
    renewals: Array<{
      subscriptionId: string;
      customerId: string;
      status: "succeeded" | "failed" | "skipped";
      amount?: number;
      error?: string;
      planChanged?: { from: string; to: string };
    }>;
  }>;
}

/**
 * Helper to extract feature codes from BillSDKOptions
 */

// biome-ignore lint/suspicious/noExplicitAny: TypeScript requires `any` here to support both readonly and mutable feature arrays (const vs let)
type ExtractFeatureCodesFromOptions<Options extends BillSDKOptions<any>> =
  Options extends BillSDKOptions<infer TFeatures>
    ? TFeatures extends readonly FeatureConfig<string>[]
      ? ExtractFeatureCodes<TFeatures>
      : string
    : string;

/**
 * The main BillSDK instance type
 */
// biome-ignore lint/suspicious/noExplicitAny: TypeScript requires `any` here to support both readonly and mutable feature arrays (const vs let)
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
  // biome-ignore lint/suspicious/noExplicitAny: Context type is defined in billsdk package, not core - keeping loose to avoid circular deps
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
