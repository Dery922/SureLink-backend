/**
 * Application error type used for consistent API responses.
 *
 * The global error handler reads:
 * - `status` / `statusCode` for HTTP status
 * - `code` for a stable, machine-readable error identifier
 * - `details` for optional context safe to return to clients
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.name = "AppError";
    this.status = statusCode;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
