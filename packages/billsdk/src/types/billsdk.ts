import type { BillingContext } from "../context/create-context";
import type { Customer, Plan, PlanPrice, Subscription } from "./models";
import type { BillSDKOptions } from "./options";

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
  };

  /**
   * Error codes
   */
  $ERROR_CODES: {
    CUSTOMER_NOT_FOUND: "CUSTOMER_NOT_FOUND";
    PLAN_NOT_FOUND: "PLAN_NOT_FOUND";
    SUBSCRIPTION_NOT_FOUND: "SUBSCRIPTION_NOT_FOUND";
    INVALID_REQUEST: "INVALID_REQUEST";
    INTERNAL_ERROR: "INTERNAL_ERROR";
  };
}
