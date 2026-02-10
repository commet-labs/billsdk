import { describe, expect, it } from "vitest";
import type { BillingContext } from "../context/create-context";
import { generateCsrfToken } from "../utils/csrf";
import { createRouter } from "./router";

const TEST_SECRET = "test-secret-that-is-at-least-32-characters-long!!";
const TEST_ORIGIN = "https://myapp.com";

/**
 * Create a minimal BillingContext for testing the router's security layer.
 */
function createTestContext(
  overrides: Partial<BillingContext> = {},
): BillingContext {
  return {
    options: {
      database: {} as BillingContext["options"]["database"],
      basePath: "/api/billing",
      secret: TEST_SECRET,
      trustedOrigins: [TEST_ORIGIN],
      plugins: [],
      hooks: {},
      logger: { level: "error", disabled: false },
    },
    basePath: "/api/billing",
    adapter: {} as BillingContext["adapter"],
    internalAdapter: {} as BillingContext["internalAdapter"],
    schema: {} as BillingContext["schema"],
    plugins: [],
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    secret: TEST_SECRET,
    trustedOrigins: [TEST_ORIGIN],
    timeProvider: { now: async () => new Date() },
    hasPlugin: () => false,
    getPlugin: () => null,
    generateId: () => "test-id",
    ...overrides,
  } as BillingContext;
}

/**
 * Build a Request with the given options.
 */
function buildRequest(
  path: string,
  options: {
    method?: string;
    origin?: string;
    csrfHeader?: string;
    csrfCookie?: string;
    authorization?: string;
  } = {},
): Request {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.origin) {
    headers.Origin = options.origin;
  }
  if (options.csrfHeader) {
    headers["x-billsdk-csrf"] = options.csrfHeader;
  }
  if (options.csrfCookie) {
    headers.Cookie = `__billsdk_csrf=${options.csrfCookie}`;
  }
  if (options.authorization) {
    headers.Authorization = options.authorization;
  }
  return new Request(`https://myapp.com/api/billing${path}`, {
    method,
    headers,
    body: method !== "GET" ? JSON.stringify({}) : undefined,
  });
}

async function getResponseError(
  response: Response,
): Promise<{ code: string; message: string }> {
  const data = (await response.json()) as {
    error: { code: string; message: string };
  };
  return data.error;
}

describe("Router security", () => {
  describe("GET requests (safe methods)", () => {
    it("allows GET without any security headers", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const request = buildRequest("/health", { method: "GET" });
      const response = await handler(request);
      expect(response.status).toBe(200);
    });
  });

  describe("CSRF token endpoint", () => {
    it("returns a CSRF token on GET /csrf-token", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const request = buildRequest("/csrf-token", { method: "GET" });
      const response = await handler(request);
      expect(response.status).toBe(200);

      const data = (await response.json()) as { csrfToken: string };
      expect(data.csrfToken).toBeDefined();
      expect(data.csrfToken).toContain(".");

      // Should set cookie
      const setCookie = response.headers.get("Set-Cookie");
      expect(setCookie).toContain("__billsdk_csrf=");
      expect(setCookie).toContain("HttpOnly");
      expect(setCookie).toContain("SameSite=Lax");
    });
  });

  describe("Origin check on mutations", () => {
    it("rejects POST without Origin header", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const request = buildRequest("/customer", { method: "POST" });
      const response = await handler(request);
      expect(response.status).toBe(403);
      const error = await getResponseError(response);
      expect(error.code).toBe("INVALID_ORIGIN");
    });

    it("rejects POST with untrusted Origin", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const request = buildRequest("/customer", {
        method: "POST",
        origin: "https://evil.com",
      });
      const response = await handler(request);
      expect(response.status).toBe(403);
      const error = await getResponseError(response);
      expect(error.code).toBe("INVALID_ORIGIN");
    });

    it("passes origin check with trusted Origin", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      // Passes origin but will fail CSRF (next layer)
      const request = buildRequest("/customer", {
        method: "POST",
        origin: TEST_ORIGIN,
      });
      const response = await handler(request);
      // Should fail on CSRF, not origin
      expect(response.status).toBe(403);
      const error = await getResponseError(response);
      expect(error.code).toBe("INVALID_CSRF_TOKEN");
    });

    it("matches wildcard origins", async () => {
      const ctx = createTestContext({
        trustedOrigins: ["*.myapp.com"],
        options: {
          ...createTestContext().options,
          trustedOrigins: ["*.myapp.com"],
        },
      });
      const { handler } = createRouter(ctx);
      const request = buildRequest("/customer", {
        method: "POST",
        origin: "https://sub.myapp.com",
      });
      const response = await handler(request);
      // Should pass origin, fail on CSRF
      const error = await getResponseError(response);
      expect(error.code).toBe("INVALID_CSRF_TOKEN");
    });
  });

  describe("CSRF check on mutations", () => {
    it("rejects POST with mismatched CSRF header and cookie", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const token = await generateCsrfToken(TEST_SECRET);
      const request = buildRequest("/customer", {
        method: "POST",
        origin: TEST_ORIGIN,
        csrfHeader: token,
        csrfCookie: "different-token",
      });
      const response = await handler(request);
      expect(response.status).toBe(403);
      const error = await getResponseError(response);
      expect(error.code).toBe("INVALID_CSRF_TOKEN");
    });

    it("rejects POST with forged CSRF token (wrong secret)", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const forgedToken = await generateCsrfToken(
        "wrong-secret-32-chars-long!!!!!!!",
      );
      const request = buildRequest("/customer", {
        method: "POST",
        origin: TEST_ORIGIN,
        csrfHeader: forgedToken,
        csrfCookie: forgedToken,
      });
      const response = await handler(request);
      expect(response.status).toBe(403);
      const error = await getResponseError(response);
      expect(error.code).toBe("INVALID_CSRF_TOKEN");
    });

    it("allows POST with valid origin + valid CSRF token", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const token = await generateCsrfToken(TEST_SECRET);
      const request = buildRequest("/customer", {
        method: "POST",
        origin: TEST_ORIGIN,
        csrfHeader: token,
        csrfCookie: token,
      });
      const response = await handler(request);
      // Should NOT be 403 (may be 400 due to missing body, but security passed)
      expect(response.status).not.toBe(403);
    });
  });

  describe("Webhook skip", () => {
    it("allows POST /webhook without origin or CSRF", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const request = buildRequest("/webhook", { method: "POST" });
      const response = await handler(request);
      // Should NOT be 403 (may be 500 due to missing adapter, but security skipped)
      expect(response.status).not.toBe(403);
    });
  });

  describe("Bearer secret bypass (server-to-server)", () => {
    it("allows POST with valid Bearer secret, no origin or CSRF needed", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const request = buildRequest("/customer", {
        method: "POST",
        authorization: `Bearer ${TEST_SECRET}`,
      });
      const response = await handler(request);
      // Should NOT be 403 (security bypassed)
      expect(response.status).not.toBe(403);
    });

    it("allows POST with lowercase 'bearer' scheme", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const request = buildRequest("/customer", {
        method: "POST",
        authorization: `bearer ${TEST_SECRET}`,
      });
      const response = await handler(request);
      expect(response.status).not.toBe(403);
    });

    it("allows POST with extra whitespace in Authorization header", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const request = buildRequest("/customer", {
        method: "POST",
        authorization: `  Bearer   ${TEST_SECRET}  `,
      });
      const response = await handler(request);
      expect(response.status).not.toBe(403);
    });

    it("rejects POST with wrong Bearer secret", async () => {
      const ctx = createTestContext();
      const { handler } = createRouter(ctx);
      const request = buildRequest("/customer", {
        method: "POST",
        authorization: "Bearer wrong-secret",
      });
      const response = await handler(request);
      expect(response.status).toBe(403);
    });

  });

  describe("Dev mode (empty trustedOrigins)", () => {
    it("skips origin check when trustedOrigins is empty", async () => {
      const ctx = createTestContext({
        trustedOrigins: [],
        options: {
          ...createTestContext().options,
          trustedOrigins: [],
        },
      });
      const { handler } = createRouter(ctx);
      const request = buildRequest("/customer", {
        method: "POST",
        origin: "https://anything.com",
      });
      const response = await handler(request);
      // Should pass origin check, fail on CSRF
      const error = await getResponseError(response);
      expect(error.code).toBe("INVALID_CSRF_TOKEN");
    });
  });
});
