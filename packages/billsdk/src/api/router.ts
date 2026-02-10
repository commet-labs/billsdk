import type { BillingContext } from "../context/create-context";
import type { BillingEndpoint } from "../types/api";
import {
  buildCsrfCookieHeader,
  generateCsrfToken,
  parseCsrfCookie,
  verifyCsrfToken,
} from "../utils/csrf";
import { matchesAnyOrigin } from "../utils/trusted-origins";
import { customerEndpoints } from "./routes/customer";
import { featureEndpoints } from "./routes/features";
import { healthEndpoint } from "./routes/health";
import { paymentEndpoints } from "./routes/payment";
import { planEndpoints } from "./routes/plan";
import { refundEndpoints } from "./routes/refund";
import { renewalEndpoints } from "./routes/renewals";
import { subscriptionEndpoints } from "./routes/subscription";
import { webhookEndpoints } from "./routes/webhook";

const CSRF_COOKIE_NAME = "__billsdk_csrf";
const CSRF_HEADER_NAME = "x-billsdk-csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SECURITY_SKIP_PATHS = new Set(["/webhook"]);

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
    ...paymentEndpoints,
    ...refundEndpoints,
    ...renewalEndpoints,
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
 * Check if the request passes origin validation.
 * Returns an error response if origin is invalid, or null if valid.
 */
function checkOrigin(
  request: Request,
  trustedOrigins: string[],
): { error: Response } | null {
  // No trusted origins configured: skip (dev mode)
  if (trustedOrigins.length === 0) return null;

  const origin =
    request.headers.get("origin") || request.headers.get("referer") || "";

  if (!origin || origin === "null") {
    return {
      error: errorResponse(
        "INVALID_ORIGIN",
        "Missing or null Origin header. Add your app's URL to trustedOrigins.",
        403,
      ),
    };
  }

  if (!matchesAnyOrigin(origin, trustedOrigins)) {
    return {
      error: errorResponse(
        "INVALID_ORIGIN",
        `Origin ${origin} is not in trustedOrigins. Add it to your billsdk config.`,
        403,
      ),
    };
  }

  return null;
}

/**
 * Check if the request passes CSRF token validation.
 * Returns an error response if CSRF is invalid, or null if valid.
 */
async function checkCsrf(
  request: Request,
  secret: string,
): Promise<{ error: Response } | null> {
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);
  if (!csrfHeader) {
    return {
      error: errorResponse(
        "INVALID_CSRF_TOKEN",
        "Missing CSRF token. The BillSDK client handles this automatically.",
        403,
      ),
    };
  }

  const cookieHeader = request.headers.get("cookie");
  const csrfCookie = parseCsrfCookie(cookieHeader, CSRF_COOKIE_NAME);
  if (!csrfCookie) {
    return {
      error: errorResponse(
        "INVALID_CSRF_TOKEN",
        "Missing CSRF cookie. Ensure credentials are included in requests.",
        403,
      ),
    };
  }

  // Cookie and header must match
  if (csrfHeader !== csrfCookie) {
    return {
      error: errorResponse("INVALID_CSRF_TOKEN", "CSRF token mismatch.", 403),
    };
  }

  // Verify HMAC signature
  const isValid = await verifyCsrfToken(csrfHeader, secret);
  if (!isValid) {
    return {
      error: errorResponse(
        "INVALID_CSRF_TOKEN",
        "CSRF token signature invalid.",
        403,
      ),
    };
  }

  return null;
}

/**
 * Handle the GET /csrf-token endpoint.
 * Generates a new CSRF token, sets it as a cookie, and returns it in the response body.
 */
async function handleCsrfTokenEndpoint(ctx: BillingContext): Promise<Response> {
  const token = await generateCsrfToken(ctx.secret);

  const isSecure =
    typeof globalThis.process !== "undefined" &&
    globalThis.process.env?.NODE_ENV === "production";

  const cookieHeader = buildCsrfCookieHeader(CSRF_COOKIE_NAME, token, isSecure);

  return new Response(JSON.stringify({ csrfToken: token }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeader,
    },
  });
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

    // Handle CSRF token endpoint
    if (path === "/csrf-token" && method === "GET") {
      return handleCsrfTokenEndpoint(ctx);
    }

    // Security: origin + CSRF check for mutating requests
    if (!SAFE_METHODS.has(method) && !SECURITY_SKIP_PATHS.has(path)) {
      // 1. Origin check
      const originResult = checkOrigin(request, ctx.trustedOrigins);
      if (originResult) {
        ctx.logger.warn("Origin check failed", {
          path,
          origin:
            request.headers.get("origin") ||
            request.headers.get("referer") ||
            "(none)",
        });
        return originResult.error;
      }

      // 2. CSRF token check
      const csrfResult = await checkCsrf(request, ctx.secret);
      if (csrfResult) {
        ctx.logger.warn("CSRF check failed", { path });
        return csrfResult.error;
      }
    }

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
      // biome-ignore lint/suspicious/noExplicitAny: Each endpoint defines its own body/query types - router dispatches generically
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
