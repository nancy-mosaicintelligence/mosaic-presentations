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
  1: (doc) => ({ ...doc, schemaVersion: 2 }),
  // 2 → 3: elements gained the `group` type (a container with its own reveal) and the document an optional
  // `assets` map. Optional again, so the upgrade is the version stamp; a v2 document keeps the geometry its
  // renderer embeds.
  2: (doc) => ({ ...doc, schemaVersion: 3 }),
  // 3 → 4: elements gained an optional `hidden` (the editor's visibility control). Version stamp.
  3: (doc) => ({ ...doc, schemaVersion: 4 }),
  // 4 → 5: asset sources may also be objects in the application's private storage (`storage://bucket/path.svg`).
  // A relaxation of the grammar only; every v4 document is a v5 document.
  4: (doc) => ({ ...doc, schemaVersion: 5 }),
  // 5 → 6: the `image` element (an asset shown in a section, with size and adjustments) and the `image` asset kind.
  // Additive; the stamp is the migration.
  5: (doc) => ({ ...doc, schemaVersion: 6 }),
  // 6 → 7: the composer — `scene` on the document, `in` on elements, `close` on stations, the `itw-lockup` scene. Stamp.
  6: (doc) => ({ ...doc, schemaVersion: 7 })
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
