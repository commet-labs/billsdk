import type {
  BillingEndpoint,
  EndpointOptions,
  HttpMethod,
} from "../types/api";

/**
 * Generic billing context type for plugin endpoints
 * Plugins can use this type to create endpoints without importing the full BillingContext
 */
export interface GenericBillingContext {
  basePath: string;
  logger: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
  internalAdapter: unknown;
  plugins: unknown[];
  options: unknown;
}

/**
 * Generic endpoint context for plugins
 */
export interface GenericEndpointContext<TBody = unknown, TQuery = unknown> {
  request: Request;
  body: TBody;
  query: TQuery;
  headers: Headers;
  params: Record<string, string>;
  ctx: GenericBillingContext;
}

/**
 * Create a billing endpoint
 *
 * This is the main helper for creating endpoints in BillSDK plugins.
 *
 * @example
 * ```typescript
 * import { createBillingEndpoint } from "@billsdk/core/api";
 * import { z } from "zod";
 *
 * export const myEndpoint = createBillingEndpoint(
 *   "/my-endpoint",
 *   {
 *     method: "POST",
 *     body: z.object({ name: z.string() }),
 *   },
 *   async (ctx) => {
 *     return { success: true, name: ctx.body.name };
 *   }
 * );
 * ```
 */
export function createBillingEndpoint<
  TBody = unknown,
  TQuery = unknown,
  TResponse = unknown,
>(
  path: string,
  options: EndpointOptions,
  handler: (
    context: GenericEndpointContext<TBody, TQuery>,
  ) => Promise<TResponse> | TResponse,
): BillingEndpoint {
  return {
    path,
    options,
    handler: handler as BillingEndpoint["handler"],
  };
}

/**
 * Middleware context for billing middlewares
 */
export interface MiddlewareContext {
  request: Request;
  path: string;
  method: string;
  billingContext: GenericBillingContext;
}

/**
 * Middleware handler function
 */
export type MiddlewareHandler = (
  context: MiddlewareContext,
) => Promise<Response | undefined> | Response | undefined;

/**
 * Middleware matcher function
 */
export type MiddlewareMatcher = (info: {
  path: string;
  method: string;
}) => boolean;

/**
 * Billing middleware definition
 */
export interface BillingMiddleware {
  matcher: MiddlewareMatcher;
  handler: MiddlewareHandler;
}

/**
 * Create a billing middleware
 *
 * Middlewares run before or after endpoint handlers.
 *
 * @example
 * ```typescript
 * import { createBillingMiddleware } from "@billsdk/core/api";
 *
 * export const authMiddleware = createBillingMiddleware(
 *   // Matcher: which paths/methods this middleware applies to
 *   ({ path }) => path.startsWith("/admin"),
 *   // Handler: the middleware logic
 *   async (ctx) => {
 *     const token = ctx.request.headers.get("Authorization");
 *     if (!token) {
 *       return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
 *     }
 *     // Continue to endpoint handler (return void)
 *   }
 * );
 * ```
 */
export function createBillingMiddleware(
  matcher: MiddlewareMatcher,
  handler: MiddlewareHandler,
): BillingMiddleware {
  return { matcher, handler };
}

/**
 * Helper to match all paths
 */
export const matchAll: MiddlewareMatcher = () => true;

/**
 * Helper to match specific HTTP methods
 */
export function matchMethod(...methods: HttpMethod[]): MiddlewareMatcher {
  return ({ method }) => methods.includes(method as HttpMethod);
}

/**
 * Helper to match paths starting with a prefix
 */
export function matchPath(prefix: string): MiddlewareMatcher {
  return ({ path }) => path.startsWith(prefix);
}
