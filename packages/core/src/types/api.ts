import type { z } from "zod";
import type { PaymentAdapter } from "./payment";

/**
 * HTTP methods supported by the API
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Endpoint options
 */
export interface EndpointOptions {
  method: HttpMethod;
  body?: z.ZodType;
  query?: z.ZodType;
  metadata?: Record<string, unknown>;
}

/**
 * Generic billing context interface for core types
 * The full BillingContext is defined in the billsdk package
 */
export interface GenericBillingContext {
  basePath: string;
  logger: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  // biome-ignore lint/suspicious/noExplicitAny: Loose typing keeps plugin authoring simple - avoids complex type imports
  internalAdapter: any;
  // biome-ignore lint/suspicious/noExplicitAny: Loose typing keeps plugin authoring simple - avoids complex type imports
  plugins: any[];
  // biome-ignore lint/suspicious/noExplicitAny: Loose typing keeps plugin authoring simple - avoids complex type imports
  options: any;
  /**
   * Payment adapter for processing payments
   */
  paymentAdapter?: PaymentAdapter;
}

/**
 * Endpoint context passed to handlers
 */
export interface EndpointContext<TBody = unknown, TQuery = unknown> {
  request: Request;
  body: TBody;
  query: TQuery;
  headers: Headers;
  params: Record<string, string>;
  ctx: GenericBillingContext;
}

/**
 * Endpoint handler function
 */
export type EndpointHandler<
  TBody = unknown,
  TQuery = unknown,
  TResponse = unknown,
> = (context: EndpointContext<TBody, TQuery>) => Promise<TResponse> | TResponse;

/**
 * Billing endpoint definition
 * Uses GenericBillingEndpointContext for flexible typing while maintaining type safety
 */
export interface BillingEndpoint {
  path: string;
  options: EndpointOptions;
  // biome-ignore lint/suspicious/noExplicitAny: Loose typing keeps plugin authoring simple - handlers can define their own context shape
  handler: (context: any) => Promise<unknown> | unknown;
}

/**
 * API response type
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
