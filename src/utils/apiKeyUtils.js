import crypto from "crypto";

const KEY_PREFIX = "nlk_";
const KEY_BYTES = 32;

/**
 * Generate a new random API key (prefix + base64url).
 * Caller must hash and store; return value is the only time the raw key is available.
 */
export function generateRawKey() {
  const random = crypto.randomBytes(KEY_BYTES).toString("base64url");
  return `${KEY_PREFIX}${random}`;
}

/**
 * SHA-256 hash of the key for storage. Use digest('hex') for consistent string length.
 */
export function hashKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
export function secureCompare(storedHashHex, rawKey) {
  const computed = crypto.createHash("sha256").update(rawKey, "utf8").digest();
  const stored = Buffer.from(storedHashHex, "hex");
  if (computed.length !== stored.length) return false;
  return crypto.timingSafeEqual(computed, stored);
}

/**
 * First 8 characters for display only (e.g. nlk_abcd).
 */
export function getKeyPrefix(rawKey) {
  return rawKey.slice(0, 8);
}
