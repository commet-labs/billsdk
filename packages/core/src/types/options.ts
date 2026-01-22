import type { DBAdapter } from "./adapter";
import type { PaymentAdapter } from "./payment";
import type { BillSDKPlugin } from "./plugins";

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
  extends Required<Omit<BillSDKOptions, "plugins" | "hooks" | "logger" | "payment">> {
  plugins: BillSDKPlugin[];
  payment?: PaymentAdapter;
  hooks: {
    before?: BillingMiddleware;
    after?: BillingMiddleware;
  };
  logger: {
    level: "debug" | "info" | "warn" | "error";
    disabled: boolean;
  };
}
