import { ApiKey } from "../models/ApiKey.js";
import {
  generateRawKey,
  hashKey,
  secureCompare,
  getKeyPrefix,
} from "../utils/apiKeyUtils.js";
import { NotFoundError } from "../utils/errors.js";

/**
 * Create a new API key. Raw key is returned only once.
 */
export async function createApiKey(name) {
  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);
  const prefix = getKeyPrefix(rawKey);
  const doc = await ApiKey.create({ name, keyHash, prefix });
  return {
    id: doc._id.toString(),
    name: doc.name,
    key: rawKey,
    prefix: doc.prefix,
    createdAt: doc.createdAt,
  };
}

/**
 * List all API keys (no raw key); optional filter by active only.
 */
export async function listApiKeys(activeOnly = false) {
  const query = activeOnly ? { revokedAt: null } : {};
  const keys = await ApiKey.find(query)
    .sort({ createdAt: -1 })
    .lean();
  return keys.map((k) => ({
    id: k._id.toString(),
    name: k.name,
    prefix: k.prefix,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    revokedAt: k.revokedAt,
  }));
}

/**
 * Revoke an API key by id.
 */
export async function revokeApiKey(id) {
  const doc = await ApiKey.findByIdAndUpdate(
    id,
    { revokedAt: new Date() },
    { new: true }
  );
  if (!doc) throw new NotFoundError("API key not found");
  return { id: doc._id.toString(), revokedAt: doc.revokedAt };
}

/**
 * Validate raw key: if it matches a non-revoked key, update lastUsedAt and return true.
 * Returns false if invalid or revoked.
 */
export async function validateAndTouchKey(rawKey) {
  const keys = await ApiKey.find({ revokedAt: null }).lean();
  for (const k of keys) {
    if (secureCompare(k.keyHash, rawKey)) {
      await ApiKey.findByIdAndUpdate(k._id, {
        lastUsedAt: new Date(),
      });
      return true;
    }
  }
  return false;
}
