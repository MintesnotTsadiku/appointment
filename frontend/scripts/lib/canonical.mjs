/**
 * Canonical JSON + SHA-256 hashing, byte-for-byte compatible with the Python
 * implementation in `appointment/public_experience/canonical.py`.
 *
 * Both sides sort object keys, emit no insignificant whitespace and hash the
 * UTF-8 bytes with SHA-256. Only ASCII strings and integers appear in the
 * hashed documents, so the two encoders cannot disagree.
 */
import { createHash } from "node:crypto";

export function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) sorted[key] = sortValue(value[key]);
    return sorted;
  }
  return value;
}

export function canonicalize(document) {
  return JSON.stringify(sortValue(document));
}

export function hashDocument(document) {
  return createHash("sha256").update(canonicalize(document), "utf8").digest("hex");
}
