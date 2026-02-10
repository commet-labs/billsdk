import { describe, expect, it } from "vitest";
import { matchesAnyOrigin, matchesOriginPattern } from "./trusted-origins";

describe("matchesOriginPattern", () => {
  it("matches exact origin", () => {
    expect(
      matchesOriginPattern("https://example.com", "https://example.com"),
    ).toBe(true);
  });

  it("rejects different origin", () => {
    expect(
      matchesOriginPattern("https://evil.com", "https://example.com"),
    ).toBe(false);
  });

  it("rejects different protocol", () => {
    expect(
      matchesOriginPattern("http://example.com", "https://example.com"),
    ).toBe(false);
  });

  it("matches wildcard subdomain", () => {
    expect(
      matchesOriginPattern("https://sub.example.com", "*.example.com"),
    ).toBe(true);
  });

  it("does not match root domain with wildcard subdomain", () => {
    expect(matchesOriginPattern("https://example.com", "*.example.com")).toBe(
      false,
    );
  });

  it("matches wildcard with protocol", () => {
    expect(
      matchesOriginPattern("https://app.example.com", "https://*.example.com"),
    ).toBe(true);
  });

  it("rejects wildcard with wrong protocol", () => {
    expect(
      matchesOriginPattern("http://app.example.com", "https://*.example.com"),
    ).toBe(false);
  });

  it("matches origin from full URL with path", () => {
    expect(
      matchesOriginPattern(
        "https://example.com/api/billing",
        "https://example.com",
      ),
    ).toBe(true);
  });

  it("handles port in origin", () => {
    expect(
      matchesOriginPattern("http://localhost:3000", "http://localhost:3000"),
    ).toBe(true);
  });

  it("rejects different port", () => {
    expect(
      matchesOriginPattern("http://localhost:3001", "http://localhost:3000"),
    ).toBe(false);
  });

  it("returns false for empty inputs", () => {
    expect(matchesOriginPattern("", "https://example.com")).toBe(false);
    expect(matchesOriginPattern("https://example.com", "")).toBe(false);
  });
});

describe("matchesAnyOrigin", () => {
  it("matches if any pattern matches", () => {
    expect(
      matchesAnyOrigin("https://app.example.com", [
        "https://other.com",
        "*.example.com",
      ]),
    ).toBe(true);
  });

  it("rejects if no pattern matches", () => {
    expect(
      matchesAnyOrigin("https://evil.com", [
        "https://example.com",
        "*.myapp.com",
      ]),
    ).toBe(false);
  });

  it("returns false for empty trusted origins", () => {
    expect(matchesAnyOrigin("https://example.com", [])).toBe(false);
  });
});
