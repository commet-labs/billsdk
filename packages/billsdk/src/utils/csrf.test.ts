import { describe, expect, it } from "vitest";
import {
  buildCsrfCookieHeader,
  generateCsrfToken,
  parseCsrfCookie,
  verifyCsrfToken,
} from "./csrf";

const TEST_SECRET = "test-secret-that-is-at-least-32-characters-long!!";

describe("generateCsrfToken", () => {
  it("generates a token with random.signature format", async () => {
    const token = await generateCsrfToken(TEST_SECRET);
    expect(token).toContain(".");
    const [random, signature] = token.split(".");
    expect(random).toHaveLength(64); // 32 bytes hex
    expect(signature!.length).toBeGreaterThan(0);
  });

  it("generates unique tokens each time", async () => {
    const token1 = await generateCsrfToken(TEST_SECRET);
    const token2 = await generateCsrfToken(TEST_SECRET);
    expect(token1).not.toBe(token2);
  });
});

describe("verifyCsrfToken", () => {
  it("verifies a valid token", async () => {
    const token = await generateCsrfToken(TEST_SECRET);
    const isValid = await verifyCsrfToken(token, TEST_SECRET);
    expect(isValid).toBe(true);
  });

  it("rejects a token signed with different secret", async () => {
    const token = await generateCsrfToken(TEST_SECRET);
    const isValid = await verifyCsrfToken(
      token,
      "different-secret-also-32-chars-long!!",
    );
    expect(isValid).toBe(false);
  });

  it("rejects a tampered token", async () => {
    const token = await generateCsrfToken(TEST_SECRET);
    const tampered = `tampered${token.slice(8)}`;
    const isValid = await verifyCsrfToken(tampered, TEST_SECRET);
    expect(isValid).toBe(false);
  });

  it("rejects a token without separator", async () => {
    const isValid = await verifyCsrfToken("noseparator", TEST_SECRET);
    expect(isValid).toBe(false);
  });

  it("rejects empty parts", async () => {
    expect(await verifyCsrfToken(".signature", TEST_SECRET)).toBe(false);
    expect(await verifyCsrfToken("random.", TEST_SECRET)).toBe(false);
  });
});

describe("parseCsrfCookie", () => {
  it("parses cookie from header", () => {
    const result = parseCsrfCookie(
      "__billsdk_csrf=abc123; other=value",
      "__billsdk_csrf",
    );
    expect(result).toBe("abc123");
  });

  it("returns null when cookie not found", () => {
    const result = parseCsrfCookie("other=value", "__billsdk_csrf");
    expect(result).toBeNull();
  });

  it("returns null for null header", () => {
    const result = parseCsrfCookie(null, "__billsdk_csrf");
    expect(result).toBeNull();
  });
});

describe("buildCsrfCookieHeader", () => {
  it("builds header without Secure in dev", () => {
    const header = buildCsrfCookieHeader("__billsdk_csrf", "token123", false);
    expect(header).toBe(
      "__billsdk_csrf=token123; HttpOnly; SameSite=Lax; Path=/",
    );
  });

  it("builds header with Secure in production", () => {
    const header = buildCsrfCookieHeader("__billsdk_csrf", "token123", true);
    expect(header).toContain("Secure");
  });
});
