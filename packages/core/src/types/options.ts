import type { BillingInterval } from "./models";
import type { DBAdapter } from "./adapter";
import type { PaymentAdapter } from "./payment";
import type { BillSDKPlugin } from "./plugins";

/**
 * Price definition for a plan
 */
export interface PlanPriceConfig {
  /**
   * Price amount in cents
   */
  amount: number;
  /**
   * Billing interval
   */
  interval: BillingInterval;
  /**
   * Currency code (ISO 4217)
   * @default "usd"
   */
  currency?: string;
  /**
   * Trial period in days
   */
  trialDays?: number;
}

/**
 * Plan definition for declarative configuration
 */
export interface PlanConfig {
  /**
   * Unique plan code (e.g., "free", "pro", "enterprise")
   */
  code: string;
  /**
   * Display name
   */
  name: string;
  /**
   * Plan description
   */
  description?: string;
  /**
   * Whether the plan is publicly visible
   * @default true
   */
  isPublic?: boolean;
  /**
   * Prices for different billing intervals
   */
  prices: PlanPriceConfig[];
  /**
   * Feature codes enabled for this plan
   */
  features?: string[];
}

/**
 * Feature definition for declarative configuration
 */
export interface FeatureConfig {
  /**
   * Unique feature code (e.g., "api_access", "export")
   */
  code: string;
  /**
   * Display name
   */
  name: string;
  /**
   * Feature type
   * @default "boolean"
   */
  type?: "boolean" | "metered" | "seats";
}

/**
 * Configuration options for BillSDK
 */
export interface BillSDKOptions {
  /**
   * Database adapter for persistence
   * If not provided, uses in-memory storage
   */
  database?: DBAdapter;

  /**
   * Payment adapter for processing payments
   */
  payment?: PaymentAdapter;

  /**
   * Base path for the billing API
   * @default "/api/billing"
   */
  basePath?: string;

  /**
   * Secret key for signing tokens and webhooks
   * Required in production
   */
  secret?: string;

  /**
   * Plans to seed on initialization
   * Plans are created if they don't exist (matched by code)
   */
  plans?: PlanConfig[];

  /**
   * Features to seed on initialization
   * Features are created if they don't exist (matched by code)
   */
  features?: FeatureConfig[];

  /**
   * Plugins to extend functionality
   */
  plugins?: BillSDKPlugin[];

  /**
   * Lifecycle hooks
   */
  hooks?: {
    before?: BillingMiddleware;
    after?: BillingMiddleware;
  };

  /**
   * Logger configuration
   */
  logger?: {
    level?: "debug" | "info" | "warn" | "error";
    disabled?: boolean;
  };
}

/**
 * Middleware function type for hooks
 */
export type BillingMiddleware = (context: {
  request: Request;
  path: string;
  method: string;
}) => Promise<undefined | Response> | undefined | Response;

/**
 * Resolved options with defaults applied
 */
export interface ResolvedBillSDKOptions
  extends Required<Omit<BillSDKOptions, "plugins" | "hooks" | "logger" | "payment" | "plans" | "features">> {
  plugins: BillSDKPlugin[];
  payment?: PaymentAdapter;
  plans?: PlanConfig[];
  features?: FeatureConfig[];
  hooks: {
    before?: BillingMiddleware;
    after?: BillingMiddleware;
  };
  logger: {
    level: "debug" | "info" | "warn" | "error";
    disabled: boolean;
  };
}
