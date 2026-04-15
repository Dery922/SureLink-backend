export function successResponse({ message, data = null, meta = null }) {
  return {
    success: true,
    message,
    data,
    meta,
  };
}

export function errorResponse({ message, code, details = null }) {
  return {
    success: false,
    message,
    error: {
      code,
      details,
    },
  };
}
