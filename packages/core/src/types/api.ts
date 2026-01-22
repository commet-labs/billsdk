import type { z } from "zod";
import type { BillingContext } from "../context/create-context";

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
 * Endpoint context passed to handlers
 */
export interface EndpointContext<TBody = unknown, TQuery = unknown> {
  request: Request;
  body: TBody;
  query: TQuery;
  headers: Headers;
  params: Record<string, string>;
  ctx: BillingContext;
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
  // biome-ignore lint/suspicious/noExplicitAny: Handler accepts generic context for flexible endpoint typing
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
