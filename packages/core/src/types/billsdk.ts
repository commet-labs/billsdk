import type { BillingContext } from "../context/create-context";
import type { Customer, Feature, Plan, PlanFeature, PlanPrice, Subscription } from "./models";
import type { BillSDKOptions } from "./options";
import type { CheckoutResult } from "./payment";

/**
 * Inferred API type from endpoints
 */
export interface InferredAPI {
  // Customer endpoints
  getCustomer: (params: { externalId: string }) => Promise<Customer | null>;
  createCustomer: (data: { externalId: string; email: string; name?: string }) => Promise<Customer>;

  // Plan endpoints
  listPlans: () => Promise<Plan[]>;
  getPlan: (params: { id: string }) => Promise<Plan | null>;

  // Subscription endpoints
  getSubscription: (params: { customerId: string }) => Promise<Subscription | null>;
  createSubscription: (params: {
    customerId: string;
    planCode: string;
    interval?: "monthly" | "yearly";
    successUrl: string;
    cancelUrl: string;
  }) => Promise<{ subscription: Subscription; checkoutUrl: string }>;

  // Feature endpoints
  checkFeature: (params: { customerId: string; feature: string }) => Promise<{ allowed: boolean }>;
  listFeatures: (params: { customerId: string }) => Promise<PlanFeature[]>;

  // Health check
  health: () => Promise<{ status: "ok"; timestamp: string }>;
}

/**
 * The main BillSDK instance type
 */
export interface BillSDK<Options extends BillSDKOptions = BillSDKOptions> {
  /**
   * Request handler for mounting to a framework
   * Compatible with Web Standard Request/Response
   */
  handler: (request: Request) => Promise<Response>;

  /**
   * Direct API access for server-side usage
   */
  api: InferredAPI;

  /**
   * Original options
   */
  options: Options;

  /**
   * Internal context (Promise for lazy initialization)
   */
  $context: Promise<BillingContext>;

  /**
   * Type inference helpers
   */
  $Infer: {
    Customer: Customer;
    Plan: Plan;
    PlanPrice: PlanPrice;
    Subscription: Subscription;
    Feature: Feature;
    PlanFeature: PlanFeature;
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
