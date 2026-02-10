import type { ClientConfig } from "./types";

/**
 * HTTP methods
 */
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Fetch options
 */
interface FetchOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string>;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Create a configured fetch function with automatic CSRF token handling.
 *
 * On the first mutating request (POST/PUT/PATCH/DELETE), the client
 * automatically fetches a CSRF token from `GET /csrf-token` and caches it.
 * The token is sent as the `x-billsdk-csrf` header on all subsequent
 * mutating requests. The matching cookie is sent automatically via
 * `credentials: "include"`.
 */
export function createFetch(config: ClientConfig = {}) {
  const baseFetch = config.fetch ?? fetch;
  const baseURL = config.baseURL ?? "/api/billing";
  const credentials = config.credentials ?? "include";

  // CSRF token cache (per createFetch instance)
  let csrfToken: string | null = null;
  let csrfPromise: Promise<string> | null = null;

  async function fetchCsrfToken(): Promise<string> {
    const response = await baseFetch(`${baseURL}/csrf-token`, {
      method: "GET",
      credentials,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }
    const data = (await response.json()) as { csrfToken: string };
    return data.csrfToken;
  }

  async function ensureCsrfToken(): Promise<string> {
    if (csrfToken) return csrfToken;

    // Deduplicate concurrent requests for the token
    if (!csrfPromise) {
      csrfPromise = fetchCsrfToken().then((token) => {
        csrfToken = token;
        csrfPromise = null;
        return token;
      });
    }

    return csrfPromise;
  }

  return async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
    const method = options.method ?? "GET";
    let url = `${baseURL}${path}`;

    // Add query params
    if (options.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) {
          params.set(key, value);
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...config.headers,
      ...options.headers,
    };

    // Auto-inject CSRF token for mutating requests
    if (MUTATING_METHODS.has(method)) {
      const token = await ensureCsrfToken();
      headers["x-billsdk-csrf"] = token;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      credentials,
    };

    if (options.body && ["POST", "PUT", "PATCH"].includes(method)) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await baseFetch(url, fetchOptions);

    if (!response.ok) {
      // If CSRF token was rejected, clear cache and retry once
      if (
        response.status === 403 &&
        MUTATING_METHODS.has(method) &&
        csrfToken
      ) {
        const errorData = (await response
          .json()
          .catch(() => ({ error: { code: "" } }))) as {
          error?: { code?: string };
        };
        if (errorData?.error?.code === "INVALID_CSRF_TOKEN") {
          // Clear token and retry
          csrfToken = null;
          csrfPromise = null;
          const newToken = await ensureCsrfToken();
          headers["x-billsdk-csrf"] = newToken;

          const retryResponse = await baseFetch(url, {
            ...fetchOptions,
            headers,
          });
          if (!retryResponse.ok) {
            const retryError = (await retryResponse
              .json()
              .catch(() => ({ error: { message: "Unknown error" } }))) as {
              error?: { message?: string };
            };
            throw new Error(
              retryError?.error?.message ??
                `Request failed: ${retryResponse.status}`,
            );
          }
          return retryResponse.json() as Promise<T>;
        }
      }

      const errorData = (await response
        .json()
        .catch(() => ({ error: { message: "Unknown error" } }))) as {
        error?: { message?: string };
      };
      throw new Error(
        errorData?.error?.message ?? `Request failed: ${response.status}`,
      );
    }

    return response.json() as Promise<T>;
  };
}

/**
 * Path segments for the proxy
 */
type PathSegment = string;

/**
 * Create a proxy that converts method calls to API requests
 *
 * @example
 * ```typescript
 * const api = createProxy($fetch);
 * await api.customer.get({ query: { externalId: "123" } });
 * await api.plans.list();
 * ```
 */
export function createProxy<T extends ReturnType<typeof createFetch>>(
  $fetch: T,
  pathMethods: Record<string, HttpMethod> = {},
): Record<string, unknown> {
  // Default path methods
  const _methods: Record<string, HttpMethod> = {
    "/customer:GET": "GET",
    "/customer:POST": "POST",
    "/plans:GET": "GET",
    "/plan:GET": "GET",
    "/subscription:GET": "GET",
    "/health:GET": "GET",
    ...pathMethods,
  };

  function createNestedProxy(segments: PathSegment[]): unknown {
    return new Proxy(() => {}, {
      get(_, prop: string) {
        // Handle special methods
        if (prop === "then" || prop === "catch" || prop === "finally") {
          return undefined;
        }

        // Add segment and return nested proxy
        return createNestedProxy([...segments, prop]);
      },

      apply(_, __, args: unknown[]) {
        // Convert segments to path
        // e.g., ["customer", "get"] -> "/customer" with GET method
        const lastSegment = segments[segments.length - 1] ?? "";
        const pathSegments = segments.slice(0, -1);

        // Determine method from last segment or default
        let method: HttpMethod = "GET";
        if (lastSegment === "get" || lastSegment === "list") {
          method = "GET";
        } else if (lastSegment === "create" || lastSegment === "post") {
          method = "POST";
        } else if (lastSegment === "update" || lastSegment === "put") {
          method = "PUT";
        } else if (lastSegment === "patch") {
          method = "PATCH";
        } else if (lastSegment === "delete" || lastSegment === "remove") {
          method = "DELETE";
        } else {
          // If last segment isn't a method, include it in path
          pathSegments.push(lastSegment);
        }

        // Build path
        const path =
          "/" +
          pathSegments
            .join("/")
            .replace(/([A-Z])/g, "-$1")
            .toLowerCase();

        // Get options from args
        const options = (args[0] as FetchOptions) ?? {};

        return $fetch(path, { ...options, method });
      },
    });
  }

  return createNestedProxy([]) as Record<string, unknown>;
}
