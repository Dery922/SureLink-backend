// src/utils/errors.js

/**
 * Custom Operational Error Class for SureLink Application Stack
 * Used to throw handled exceptions across controllers, services, and repositories.
 */
export class AppError extends Error {
  constructor(message, status = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);

    this.status = status; // HTTP Status Code (e.g., 400, 404, 429)
    this.code = code; // Business Logic String Code (e.g., 'AUTH_INVALID_PHONE')
    this.details = details; // Optional array or object with extra validation details
    this.isOperational = true; // Marks it as a handled operational error

    // Captures clean v8 execution stack frames for debugging, avoiding this constructor layer
    Error.captureStackTrace(this, this.constructor);
  }
}
