// @ts-check
import { SCHEMA_VERSION } from "./schema.js";

/**
 * Migrations, keyed by the version they upgrade FROM. Each returns a new
 * document one version higher and must be pure and deterministic.
 * @type {Record<number, (doc: any) => any>}
 */
const STEPS = {
  // 1 → 2: sections gained an optional `layout`, elements optional `role` and `style`, the document an
  // optional `animation`. All optional, so the upgrade is the version stamp alone; a v1 document renders
  // with the layout the markup already carries.
  1: (doc) => ({ ...doc, schemaVersion: 2 })
};

/**
 * Bring a document to the current schema version. Documents already current
 * are returned as a structural copy. Unknown or future versions throw.
 * @param {any} doc
 * @returns {any}
 */
export function migrate(doc) {
  if (typeof doc !== "object" || doc === null) throw new Error("migrate: document must be an object");
  let v = doc.schemaVersion;
  if (typeof v !== "number") throw new Error("migrate: schemaVersion missing");
  if (v > SCHEMA_VERSION) throw new Error(`migrate: document is schema ${v}, this build understands up to ${SCHEMA_VERSION}`);
  let out = structuredClone(doc);
  while (v < SCHEMA_VERSION) {
    const step = STEPS[v];
    if (!step) throw new Error(`migrate: no migration from schema ${v}`);
    out = step(out);
    if (out.schemaVersion !== v + 1) throw new Error(`migrate: step ${v} did not produce schema ${v + 1}`);
    v = out.schemaVersion;
  }
  return out;
}
