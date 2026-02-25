import { AppError, ValidationError } from "../utils/errors.js";

/**
 * Global error handler. Uses statusCode from AppError; hides message for 500 in production.
 * Treats Multer errors (e.g. LIMIT_FILE_SIZE) as 400.
 */
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const payload = {
      status: "error",
      message: err.message,
    };
    if (err instanceof ValidationError && err.errors) {
      payload.errors = err.errors;
    }
    return res.status(err.statusCode).json(payload);
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      status: "error",
      message: "File too large. Maximum size is 10MB per file.",
    });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      status: "error",
      message: err.message || "Unexpected file field",
    });
  }

  console.error(err.stack);
  const statusCode = err.statusCode ?? 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal server error"
      : err.message ?? "Internal server error";

  res.status(statusCode).json({ status: "error", message });
}
