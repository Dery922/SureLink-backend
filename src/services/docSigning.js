import crypto from "crypto";

// Signs admin document-view URLs so provider verification files can be stored
// as private paths yet loaded by an <img> tag without an auth header.
// C3 fix: replaces unsigned, publicly-guessable document URLs.

const SECRET = process.env.DOC_SIGNING_SECRET || process.env.SESSION_SECRET;
const TTL_MS = 15 * 60 * 1000; // links valid for 15 minutes

function hmac(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

// Builds a signed relative URL: /api/admin/verifications/:id/documents/:index?exp=..&sig=..
export function signDocUrl(id, index) {
  const exp = Date.now() + TTL_MS;
  const sig = hmac(`${id}.${index}.${exp}`);
  return `/api/admin/verifications/${id}/documents/${index}?exp=${exp}&sig=${sig}`;
}

// Constant-time validation of a signed doc request. Returns true when the
// signature matches and the link has not expired.
export function verifyDocSig({ id, index, exp, sig }) {
  const expNum = Number(exp);
  if (!sig || !Number.isFinite(expNum) || Date.now() > expNum) return false;
  const expected = hmac(`${id}.${index}.${expNum}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
