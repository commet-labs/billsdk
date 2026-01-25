import type { BillingContext } from "../context/create-context";
import type { BillingEndpoint } from "../types/api";
import { customerEndpoints } from "./routes/customer";
import { featureEndpoints } from "./routes/features";
import { healthEndpoint } from "./routes/health";
import { planEndpoints } from "./routes/plan";
import { subscriptionEndpoints } from "./routes/subscription";
import { webhookEndpoints } from "./routes/webhook";

/**
 * Collect all endpoints
 */
export function getEndpoints(
  ctx: BillingContext,
): Record<string, BillingEndpoint> {
  const baseEndpoints: Record<string, BillingEndpoint> = {
    ...healthEndpoint,
    ...customerEndpoints,
    ...planEndpoints,
    ...subscriptionEndpoints,
    ...featureEndpoints,
    ...webhookEndpoints,
  };

  // Add plugin endpoints
  let allEndpoints = { ...baseEndpoints };
  for (const plugin of ctx.plugins) {
    if (plugin.endpoints) {
      allEndpoints = { ...allEndpoints, ...plugin.endpoints };
    }
  }

  return allEndpoints;
}

/**
 * Parse URL to get path and query params
 */
function parseUrl(
  url: string,
  basePath: string,
): { path: string; query: URLSearchParams } {
  const urlObj = new URL(url);
  let path = urlObj.pathname;

  // Remove base path
  if (path.startsWith(basePath)) {
    path = path.slice(basePath.length);
  }

  // Ensure path starts with /
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return { path, query: urlObj.searchParams };
}

/**
 * Parse query params to object
 */
function queryToObject(query: URLSearchParams): Record<string, string> {
  const obj: Record<string, string> = {};
  query.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

/**
 * Create a JSON response
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Create an error response
 */
function errorResponse(code: string, message: string, status = 400): Response {
  return jsonResponse({ error: { code, message } }, status);
}

/**
 * Create the router
 */
export function createRouter(ctx: BillingContext): {
  handler: (request: Request) => Promise<Response>;
  endpoints: Record<string, BillingEndpoint>;
} {
  const endpoints = getEndpoints(ctx);

  const handler = async (request: Request): Promise<Response> => {
    const method = request.method.toUpperCase();
    const { path, query } = parseUrl(request.url, ctx.basePath);

    ctx.logger.debug(`${method} ${path}`);

    // Run before hooks
    if (ctx.options.hooks.before) {
      const result = await ctx.options.hooks.before({
        request,
        path,
        method,
      });
      if (result instanceof Response) {
        return result;
      }
    }

    // Run plugin before hooks
    for (const plugin of ctx.plugins) {
      if (plugin.hooks?.before) {
        for (const hook of plugin.hooks.before) {
          if (hook.matcher({ path, method })) {
            const result = await hook.handler({
              request,
              path,
              method,
              billingContext: ctx,
            });
            if (result instanceof Response) {
              return result;
            }
          }
        }
      }
    }

    // Find matching endpoint
    const endpointKey = Object.keys(endpoints).find((key) => {
      const endpoint = endpoints[key];
      if (!endpoint) return false;

      // Check method
      if (endpoint.options.method !== method) return false;

      // Check path (simple matching for now)
      // TODO: Add path params support
      return endpoint.path === path;
    });

    if (!endpointKey) {
      return errorResponse(
        "NOT_FOUND",
        `No endpoint found for ${method} ${path}`,
        404,
      );
    }

    const endpoint = endpoints[endpointKey]!;

    try {
      const requestForHandler = request.clone();

      // Parse body for POST/PUT/PATCH
      let body: unknown;
      if (["POST", "PUT", "PATCH"].includes(method) && endpoint.options.body) {
        try {
          const text = await request.text();
          if (text) {
            body = JSON.parse(text);
          }
        } catch {
          // Body might be empty or not JSON
        }
      }

      // Validate body if schema provided
      if (endpoint.options.body && body) {
        const result = endpoint.options.body.safeParse(body);
        if (!result.success) {
          const issues = "issues" in result.error ? result.error.issues : [];
          return errorResponse(
            "VALIDATION_ERROR",
            (issues as Array<{ message: string }>)
              .map((e) => e.message)
              .join(", "),
            400,
          );
        }
        body = result.data;
      }

      // Validate query if schema provided
      let queryObj: Record<string, string> = queryToObject(query);
      if (endpoint.options.query) {
        const result = endpoint.options.query.safeParse(queryObj);
        if (!result.success) {
          const issues = "issues" in result.error ? result.error.issues : [];
          return errorResponse(
            "VALIDATION_ERROR",
            (issues as Array<{ message: string }>)
              .map((e) => e.message)
              .join(", "),
            400,
          );
        }
        queryObj = result.data as Record<string, string>;
      }

      // Create endpoint context
      // Use cloned request so handlers can read the body if needed (e.g., webhooks)
      const endpointContext = {
        request: requestForHandler,
        body,
        query: queryObj,
        headers: requestForHandler.headers,
        params: {},
        ctx, // Add billing context
      };

      // Execute handler
      // biome-ignore lint/suspicious/noExplicitAny: Type assertion needed to call handlers with different context types
      const response = await endpoint.handler(endpointContext as any);

      // Run after hooks
      let finalResponse = jsonResponse(response);

      // Run plugin after hooks
      for (const plugin of ctx.plugins) {
        if (plugin.hooks?.after) {
          for (const hook of plugin.hooks.after) {
            if (hook.matcher({ path, method })) {
              const result = await hook.handler({
                request,
                path,
                method,
                billingContext: ctx,
              });
              if (result instanceof Response) {
                finalResponse = result;
              }
            }
          }
        }
      }

      if (ctx.options.hooks.after) {
        const result = await ctx.options.hooks.after({
          request,
          path,
          method,
        });
        if (result instanceof Response) {
          finalResponse = result;
        }
      }

      return finalResponse;
    } catch (error) {
      ctx.logger.error("Endpoint error", error);

      if (error instanceof Error) {
        return errorResponse("INTERNAL_ERROR", error.message, 500);
      }

      return errorResponse(
        "INTERNAL_ERROR",
        "An unexpected error occurred",
        500,
      );
    }
  };

  return { handler, endpoints };
}
