/**
 * CSRF token utilities using Web Crypto API (HMAC-SHA256).
 * Zero dependencies. Works in Node.js 20+, Deno, Bun, Cloudflare Workers.
 */

const ALGORITHM = "HMAC";
const HASH = "SHA-256";
const SEPARATOR = ".";

/** Default token TTL: 1 hour (in seconds). */
const DEFAULT_TTL_SECONDS = 3600;

/**
 * Import a secret string as a CryptoKey for HMAC operations.
 */
// biome-ignore lint/suspicious/noExplicitAny: CryptoKey type requires DOM lib; using any to keep tsconfig clean
async function importKey(secret: string): Promise<any> {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: ALGORITHM, hash: HASH },
    false,
    ["sign", "verify"],
  );
}

/**
 * Convert an ArrayBuffer to a hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert a hex string to a Uint8Array.
 */
function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generate a random token string (32 bytes, hex-encoded).
 */
function generateRandom(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer as ArrayBuffer);
}

/**
 * Generate a CSRF token signed with HMAC-SHA256.
 *
 * Format: `<timestamp>.<random>.<hmac(timestamp.random, secret)>`
 *
 * - `timestamp` — hex-encoded Unix seconds (creation time)
 * - `random` — 32 bytes (64 hex chars)
 * - The HMAC signs `timestamp.random` so neither can be tampered with
 *
 * Tokens expire after `DEFAULT_TTL_SECONDS` (1 hour). The client
 * auto-refreshes when the server rejects an expired token.
 */
export async function generateCsrfToken(secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const random = generateRandom();
  const payload = `${timestamp}${SEPARATOR}${random}`;
  const key = await importKey(secret);
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    ALGORITHM,
    key,
    encoder.encode(payload),
  );
  return `${payload}${SEPARATOR}${bufferToHex(signature)}`;
}

/**
 * Verify a CSRF token against the secret.
 *
 * Checks that:
 * 1. The token has the expected `timestamp.random.signature` format
 * 2. The token has not expired (based on `ttlSeconds`, default 1 hour)
 * 3. The HMAC signature matches `timestamp.random` when signed with the secret
 *
 * @param token - The CSRF token to verify
 * @param secret - The server secret used to sign the token
 * @param ttlSeconds - Maximum token age in seconds (default: 3600 = 1 hour)
 * @returns true if the token is valid, not expired, and signed with this secret
 */
export async function verifyCsrfToken(
  token: string,
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<boolean> {
  // Split into payload (timestamp.random) and signature
  const lastSep = token.lastIndexOf(SEPARATOR);
  if (lastSep === -1) return false;

  const payload = token.slice(0, lastSep);
  const signatureHex = token.slice(lastSep + 1);

  if (!payload || !signatureHex) return false;

  // Extract and validate timestamp
  const firstSep = payload.indexOf(SEPARATOR);
  if (firstSep === -1) return false;

  const timestampHex = payload.slice(0, firstSep);
  const timestamp = Number.parseInt(timestampHex, 16);

  if (Number.isNaN(timestamp)) return false;

  // Check expiration
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - timestamp > ttlSeconds) return false;

  try {
    const key = await importKey(secret);
    const encoder = new TextEncoder();
    const signatureBytes = hexToBuffer(signatureHex);

    return crypto.subtle.verify(
      ALGORITHM,
      key,
      signatureBytes,
      encoder.encode(payload),
    );
  } catch {
    return false;
  }
}

/**
 * Parse the CSRF token from the `Cookie` header.
 */
export function parseCsrfCookie(
  cookieHeader: string | null,
  cookieName: string,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieName}=`));
  return match ? match.slice(cookieName.length + 1) : null;
}

/**
 * Build a Set-Cookie header value for the CSRF cookie.
 */
export function buildCsrfCookieHeader(
  cookieName: string,
  token: string,
  secure: boolean,
): string {
  const parts = [
    `${cookieName}=${token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${DEFAULT_TTL_SECONDS}`,
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}
