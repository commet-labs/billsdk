/**
 * CSRF token utilities using Web Crypto API (HMAC-SHA256).
 * Zero dependencies. Works in Node.js 20+, Deno, Bun, Cloudflare Workers.
 */

const ALGORITHM = "HMAC";
const HASH = "SHA-256";
const SEPARATOR = ".";

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
 * Format: `<random>.<hmac(random, secret)>`
 *
 * The random part is 32 bytes (64 hex chars).
 * The HMAC is the signature of the random part using the secret.
 */
export async function generateCsrfToken(secret: string): Promise<string> {
  const random = generateRandom();
  const key = await importKey(secret);
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    ALGORITHM,
    key,
    encoder.encode(random),
  );
  return `${random}${SEPARATOR}${bufferToHex(signature)}`;
}

/**
 * Verify a CSRF token against the secret.
 *
 * Checks that the HMAC signature in the token matches the random part
 * when signed with the given secret.
 *
 * @returns true if the token is valid and was signed with this secret
 */
export async function verifyCsrfToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const separatorIndex = token.indexOf(SEPARATOR);
  if (separatorIndex === -1) return false;

  const random = token.slice(0, separatorIndex);
  const signatureHex = token.slice(separatorIndex + 1);

  if (!random || !signatureHex) return false;

  try {
    const key = await importKey(secret);
    const encoder = new TextEncoder();
    const signatureBytes = hexToBuffer(signatureHex);

    return crypto.subtle.verify(
      ALGORITHM,
      key,
      signatureBytes,
      encoder.encode(random),
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
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}
