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

/**
 * Create a configured fetch function
 */
export function createFetch(config: ClientConfig) {
  const baseFetch = config.fetch ?? fetch;

  return async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
    const method = options.method ?? "GET";
    let url = `${config.baseURL}${path}`;

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

    const fetchOptions: RequestInit = {
      method,
      headers,
      credentials: config.credentials ?? "include",
    };

    if (options.body && ["POST", "PUT", "PATCH"].includes(method)) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await baseFetch(url, fetchOptions);

    if (!response.ok) {
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
