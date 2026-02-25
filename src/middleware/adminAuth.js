import { UnauthorizedError } from "../utils/errors.js";

/**
 * Middleware: require X-Admin-Key header to match process.env.ADMIN_API_KEY.
 * Use on review, approve, reject routes.
 */
export function requireAdminKey(req, res, next) {
  const key = req.headers["x-admin-key"];
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    return next(new UnauthorizedError("Admin API key not configured"));
  }
  if (!key || key !== expected) {
    return next(new UnauthorizedError("Invalid or missing admin key"));
  }
  next();
}
