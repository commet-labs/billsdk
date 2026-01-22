import type { BillingContext } from "../context/create-context";
import type { DBFieldAttribute } from "../db/field";
import type { BillingEndpoint } from "./api";

/**
 * Plugin schema for extending the database
 */
export interface BillSDKPluginSchema {
  [tableName: string]: {
    fields: Record<string, DBFieldAttribute>;
  };
}

/**
 * Plugin hook for before/after middleware
 */
export interface BillSDKPluginHook {
  matcher: (context: { path: string; method: string }) => boolean;
  handler: (context: {
    request: Request;
    path: string;
    method: string;
    billingContext: BillingContext;
  }) => Promise<undefined | Response> | undefined | Response;
}

/**
 * BillSDK Plugin interface
 * Plugins can extend the SDK with additional functionality
 */
export interface BillSDKPlugin {
  /**
   * Unique plugin identifier
   */
  id: string;

  /**
   * Plugin name for display
   */
  name?: string;

  /**
   * Database schema extensions
   */
  schema?: BillSDKPluginSchema;

  /**
   * Additional API endpoints
   */
  endpoints?: Record<string, BillingEndpoint>;

  /**
   * Lifecycle hooks
   */
  hooks?: {
    before?: BillSDKPluginHook[];
    after?: BillSDKPluginHook[];
  };

  /**
   * Plugin initialization
   */
  init?: (context: BillingContext) => Promise<void> | void;

  /**
   * Error codes exposed by this plugin
   */
  $ERROR_CODES?: Record<string, string>;

  /**
   * Types exposed by this plugin for inference
   */
  $Infer?: Record<string, unknown>;
}

/**
 * Helper type to infer plugin types
 */
export type InferPluginTypes<Plugins extends BillSDKPlugin[]> =
  Plugins extends Array<infer P>
    ? P extends BillSDKPlugin
      ? P["$Infer"] extends Record<string, unknown>
        ? P["$Infer"]
        : object
      : object
    : object;

/**
 * Helper type to infer plugin error codes
 */
export type InferPluginErrorCodes<Plugins extends BillSDKPlugin[]> =
  Plugins extends Array<infer P>
    ? P extends BillSDKPlugin
      ? P["$ERROR_CODES"] extends Record<string, string>
        ? P["$ERROR_CODES"]
        : object
      : object
    : object;
