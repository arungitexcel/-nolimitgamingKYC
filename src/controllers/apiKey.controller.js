import * as apiKeyService from "../services/apiKey.service.js";
import { ValidationError } from "../utils/errors.js";

/**
 * POST /admin/api-keys
 * Body: { name: string }
 * Returns the raw key once; store it securely.
 */
export async function createApiKey(req, res) {
  const name = req.body?.name;
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new ValidationError("name is required");
  }
  const result = await apiKeyService.createApiKey(name.trim());
  res.status(201).json({
    message: "API key created. Store the key securely; it will not be shown again.",
    apiKey: result,
  });
}

/**
 * GET /admin/api-keys
 * List all API keys (no raw key).
 */
export async function listApiKeys(req, res) {
  const activeOnly = req.query.active === "true";
  const keys = await apiKeyService.listApiKeys(activeOnly);
  res.json({ apiKeys: keys });
}

/**
 * DELETE /admin/api-keys/:id
 * Revoke an API key.
 */
export async function revokeApiKey(req, res) {
  const result = await apiKeyService.revokeApiKey(req.params.id);
  res.json({ message: "API key revoked", ...result });
}
