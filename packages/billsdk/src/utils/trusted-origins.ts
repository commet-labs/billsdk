/**
 * Extract the origin (protocol + host) from a URL string.
 * Returns null if the URL is invalid.
 */
function getOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Extract the host (hostname + port) from a URL string.
 * Returns null if the URL is invalid.
 */
function getHost(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return null;
  }
}

/**
 * Convert a wildcard pattern to a RegExp.
 * Supports `*` (matches any characters except dots) and `**` (matches anything).
 */
function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const withWildcards = escaped
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^.]+")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");
  return new RegExp(`^${withWildcards}$`);
}

/**
 * Check if a URL's origin matches a trusted origin pattern.
 *
 * Supported patterns:
 * - Exact origin: `https://example.com`
 * - Wildcard host: `*.example.com` (matches `sub.example.com`, not `example.com`)
 * - Wildcard with protocol: `https://*.example.com`
 *
 * @param url - The full URL or origin to test
 * @param pattern - The trusted origin pattern
 * @returns true if the URL matches the pattern
 */
export function matchesOriginPattern(url: string, pattern: string): boolean {
  if (!url || !pattern) return false;

  const hasWildcard = pattern.includes("*");

  if (!hasWildcard) {
    // Exact match: compare origins
    const urlOrigin = getOrigin(url);
    return urlOrigin ? pattern === urlOrigin : false;
  }

  // Wildcard pattern
  if (pattern.includes("://")) {
    // Pattern has protocol: match against full origin
    const urlOrigin = getOrigin(url);
    if (!urlOrigin) return false;
    return wildcardToRegExp(pattern).test(urlOrigin);
  }

  // Pattern is host-only (e.g., `*.example.com`): match against host
  const host = getHost(url);
  if (!host) return false;
  return wildcardToRegExp(pattern).test(host);
}

/**
 * Check if a URL's origin matches any of the trusted origin patterns.
 */
export function matchesAnyOrigin(
  url: string,
  trustedOrigins: string[],
): boolean {
  return trustedOrigins.some((pattern) => matchesOriginPattern(url, pattern));
}
