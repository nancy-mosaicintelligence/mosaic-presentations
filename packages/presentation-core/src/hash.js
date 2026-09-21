// @ts-check
import { createHash } from "node:crypto";

/**
 * Canonical JSON: object keys sorted recursively, no whitespace, so two
 * documents with the same content hash the same regardless of key order.
 * @param {any} value
 * @returns {string}
 */
export function canonicalJSON(value) {
  return JSON.stringify(sortKeys(value));
}

/** @param {any} v @returns {any} */
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (typeof v === "object" && v !== null) {
    /** @type {Record<string, any>} */
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  }
  return v;
}

/**
 * Deterministic content hash of a document (SHA-256 of its canonical JSON).
 * @param {any} doc
 * @returns {string} hex
 */
export function contentHash(doc) {
  return createHash("sha256").update(canonicalJSON(doc)).digest("hex");
}
