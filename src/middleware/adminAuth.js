import "dotenv/config";
import { UnauthorizedError } from "../utils/errors.js";
import { validateAndTouchKey } from "../services/apiKey.service.js";

/**
 * Middleware: require X-Admin-Key header.
 * Accepts either process.env.ADMIN_API_KEY (master) or a valid API key from the DB.
 * Use on review, approve, reject routes.
 */
export async function requireAdminKey(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || typeof key !== "string") {
    return next(new UnauthorizedError("Missing admin key"));
  }
  const masterKey = process.env.ADMIN_API_KEY;
  if (masterKey && key === masterKey) {
    return next();
  }
  const valid = await validateAndTouchKey(key.trim());
  if (valid) return next();
  next(new UnauthorizedError("Invalid or expired admin key"));
}

/**
 * Middleware: require X-Admin-Key to match process.env.ADMIN_API_KEY only (master key).
 * Use for API key management (create, list, revoke); created keys cannot manage keys.
 */
export function requireMasterAdminKey(req, res, next) {
  const key = req.headers["x-admin-key"];
  const master = process.env.ADMIN_API_KEY;
  if (!master) {
    return next(new UnauthorizedError("Admin API key not configured"));
  }
  if (!key || key !== master) {
    return next(new UnauthorizedError("Invalid or missing master admin key"));
  }
  next();
}
