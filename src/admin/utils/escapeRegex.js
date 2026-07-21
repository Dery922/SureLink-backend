/**
 * Escape regex metacharacters in user-supplied search input so it is matched
 * literally. Prevents ReDoS (catastrophic backtracking) and pattern injection
 * when the string is passed to `new RegExp(...)`.
 */
export function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
