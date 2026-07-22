// src/utils/apiResponse.js

/**
 * Generates a standardized successful API response object
 * @param {Object} options
 * @param {string} options.message - Success message description
 * @param {Object|Array|null} [options.data=null] - Payload object returned to client
 * @returns {Object} Standardized success response structure
 */
export function successResponse({ message, data = null }) {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Generates a standardized error API response object
 * @param {Object} options
 * @param {string} options.message - Error message description
 * @param {string} [options.code="INTERNAL_ERROR"] - Business logic error identification string
 * @param {Object|Array|null} [options.details=null] - Validation errors array or extra debugging fields
 * @returns {Object} Standardized error response structure
 */
export function errorResponse({
  message,
  code = "INTERNAL_ERROR",
  details = null,
}) {
  return {
    success: false,
    message,
    code,
    details,
  };
}
