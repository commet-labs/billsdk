import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCsrfCookieHeader,
  generateCsrfToken,
  parseCsrfCookie,
  verifyCsrfToken,
} from "./csrf";

const TEST_SECRET = "test-secret-that-is-at-least-32-characters-long!!";

describe("generateCsrfToken", () => {
  it("generates a token with timestamp.random.signature format", async () => {
    const token = await generateCsrfToken(TEST_SECRET);
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    const [timestamp, random, signature] = parts;
    // Timestamp is hex-encoded unix seconds
    expect(Number.parseInt(timestamp!, 16)).toBeGreaterThan(0);
    // Random is 32 bytes hex
    expect(random).toHaveLength(64);
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
    const parts = token.split(".");
    const tampered = `${parts[0]}.tampered${parts[1]!.slice(8)}.${parts[2]}`;
    const isValid = await verifyCsrfToken(tampered, TEST_SECRET);
    expect(isValid).toBe(false);
  });

  it("rejects a token without separator", async () => {
    const isValid = await verifyCsrfToken("noseparator", TEST_SECRET);
    expect(isValid).toBe(false);
  });

  it("rejects a token with only one separator", async () => {
    const isValid = await verifyCsrfToken("random.signature", TEST_SECRET);
    expect(isValid).toBe(false);
  });

  it("rejects empty parts", async () => {
    expect(await verifyCsrfToken("..signature", TEST_SECRET)).toBe(false);
    expect(await verifyCsrfToken("timestamp..", TEST_SECRET)).toBe(false);
  });

  describe("token expiration", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("accepts a token within the TTL", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = await generateCsrfToken(TEST_SECRET);

      // 30 minutes later — well within the 1h default TTL
      vi.setSystemTime(new Date("2026-01-01T00:30:00Z"));
      const isValid = await verifyCsrfToken(token, TEST_SECRET);
      expect(isValid).toBe(true);
    });

    it("rejects a token after the default TTL (1 hour)", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = await generateCsrfToken(TEST_SECRET);

      // 1 hour + 1 second later
      vi.setSystemTime(new Date("2026-01-01T01:00:01Z"));
      const isValid = await verifyCsrfToken(token, TEST_SECRET);
      expect(isValid).toBe(false);
    });

    it("respects custom TTL", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = await generateCsrfToken(TEST_SECRET);

      // 5 minutes later — over a 60s TTL
      vi.setSystemTime(new Date("2026-01-01T00:05:00Z"));
      expect(await verifyCsrfToken(token, TEST_SECRET, 60)).toBe(false);

      // But within the default 1h TTL
      expect(await verifyCsrfToken(token, TEST_SECRET)).toBe(true);
    });

    it("rejects a token with a tampered (future) timestamp", async () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = await generateCsrfToken(TEST_SECRET);

      // Replace the timestamp with a future one — HMAC will mismatch
      const parts = token.split(".");
      const futureTimestamp = Math.floor(
        new Date("2027-01-01T00:00:00Z").getTime() / 1000,
      ).toString(16);
      const tampered = `${futureTimestamp}.${parts[1]}.${parts[2]}`;

      const isValid = await verifyCsrfToken(tampered, TEST_SECRET);
      expect(isValid).toBe(false);
    });
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
      "__billsdk_csrf=token123; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600",
    );
  });

  it("builds header with Secure in production", () => {
    const header = buildCsrfCookieHeader("__billsdk_csrf", "token123", true);
    expect(header).toContain("Secure");
    expect(header).toContain("Max-Age=3600");
  });
});
