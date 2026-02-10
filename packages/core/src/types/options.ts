import type { DBAdapter } from "./adapter";
import type { BillingBehaviors } from "./behaviors";
import type { BillingInterval } from "./models";
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
 * @typeParam TFeatureCode - Feature codes that are valid for this plan
 */
export interface PlanConfig<TFeatureCode extends string = string> {
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
   * Only accepts codes from defined features
   */
  features?: TFeatureCode[];
}

/**
 * Feature definition for declarative configuration
 */
export interface FeatureConfig<TCode extends string = string> {
  /**
   * Unique feature code (e.g., "api_access", "export")
   */
  code: TCode;
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
 * Helper type to extract feature codes from an array of features
 */
export type ExtractFeatureCodes<
  T extends readonly FeatureConfig<string>[] | FeatureConfig<string>[],
> = T[number]["code"];

/**
 * Configuration options for BillSDK
 *
 * @typeParam TFeatures - Array of feature configurations
 */
export interface BillSDKOptions<
  TFeatures extends
    | readonly FeatureConfig<string>[]
    | FeatureConfig<string>[] = FeatureConfig[],
> {
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
   * Secret key for signing CSRF tokens and webhooks.
   * Must be at least 32 characters. Required in production.
   *
   * If not provided, falls back to `BILLSDK_SECRET` env var.
   * In development, a default insecure secret is used with a warning.
   */
  secret?: string;

  /**
   * List of trusted origins allowed to make mutating requests (POST/PUT/PATCH/DELETE).
   *
   * Can be an array of origin strings (supports wildcards like `*.example.com`)
   * or an async function that resolves origins per-request.
   *
   * Falls back to `BILLSDK_TRUSTED_ORIGINS` env var (comma-separated).
   * If empty in production, a warning is logged.
   *
   * @example
   * ```ts
   * trustedOrigins: ["https://myapp.com", "*.myapp.com"]
   * ```
   */
  trustedOrigins?: string[] | ((request?: Request) => Promise<string[]>);

  features?: TFeatures;

  plans?: PlanConfig<ExtractFeatureCodes<TFeatures>>[];

  /**
   * Plugins to extend functionality
   */
  plugins?: BillSDKPlugin[];

  /**
   * Lifecycle hooks for HTTP requests
   */
  hooks?: {
    before?: BillingMiddleware;
    after?: BillingMiddleware;
  };

  /**
   * Configurable billing behaviors with sensible defaults.
   *
   * Each behavior is triggered after a specific billing event and can be
   * overridden to customize the side effects. The `defaultBehavior` function
   * is always provided so you can use it, skip it, or call it conditionally.
   *
   * @example
   * ```typescript
   * behaviors: {
   *   // Override: downgrade to free instead of cancel
   *   onRefund: async (ctx, { subscription }, defaultBehavior) => {
   *     await ctx.internalAdapter.updateSubscription(subscription.id, {
   *       planCode: "free",
   *     });
   *   },
   * }
   * ```
   */
  behaviors?: BillingBehaviors;

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
export interface ResolvedBillSDKOptions<
  TFeatures extends
    | readonly FeatureConfig<string>[]
    | FeatureConfig<string>[] = FeatureConfig[],
> extends Required<
    Omit<
      BillSDKOptions<TFeatures>,
      | "plugins"
      | "hooks"
      | "behaviors"
      | "logger"
      | "payment"
      | "plans"
      | "features"
      | "trustedOrigins"
    >
  > {
  plugins: BillSDKPlugin[];
  payment?: PaymentAdapter;
  plans?: PlanConfig<ExtractFeatureCodes<TFeatures>>[];
  features?: TFeatures;
  trustedOrigins: string[];
  hooks: {
    before?: BillingMiddleware;
    after?: BillingMiddleware;
  };
  behaviors?: BillingBehaviors;
  logger: {
    level: "debug" | "info" | "warn" | "error";
    disabled: boolean;
  };
}
