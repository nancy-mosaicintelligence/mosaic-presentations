// Undo and redo over a document, as commands. A command names a path into the document and the value
// to put there; applying it records the value that was there, so undo is the same operation in reverse.
// Documents are never mutated: every apply returns a new document that shares unchanged branches.

/** @typedef {(string|number)[]} Path */
/** @typedef {{ path: Path, value: any, label?: string, coalesce?: string }} Command */

const UNDEFINED = Symbol("absent");

/** Read a path; `undefined` when any step is missing. @param {any} doc @param {Path} path */
export function getAt(doc, path) {
  let v = doc;
  for (const k of path) { if (v === null || typeof v !== "object") return undefined; v = v[k]; }
  return v;
}

/**
 * Return a copy of `doc` with `path` set to `value` (or the key removed when `value` is the absent marker).
 * Intermediate objects and arrays are created as needed; untouched branches are shared.
 * @param {any} doc @param {Path} path @param {any} value
 */
export function setAt(doc, path, value) {
  if (!path.length) return value;
  const [k, ...rest] = path;
  const isIndex = typeof k === "number";
  const base = doc === null || typeof doc !== "object" ? (isIndex ? [] : {}) : doc;
  const next = Array.isArray(base) ? base.slice() : { ...base };
  if (rest.length === 0 && value === UNDEFINED) { if (Array.isArray(next)) next.splice(/** @type {number} */ (k), 1); else delete next[k]; return next; }
  next[k] = setAt(base[k], rest, value);
  return next;
}

/** The marker that means "remove this key" as a command value. */
export const ABSENT = UNDEFINED;

/**
 * A history over a document. `apply` records; `undo`/`redo` walk; `present` is the current document.
 * Consecutive commands with the same `coalesce` key inside `coalesceMs` merge into one undo step
 * (typing), keeping the first command's "before" and the last one's "after".
 * @param {any} initial @param {{ coalesceMs?: number, limit?: number, now?: () => number }} [opts]
 */
export function createHistory(initial, opts = {}) {
  const coalesceMs = opts.coalesceMs ?? 800, limit = opts.limit ?? 500, now = opts.now ?? (() => Date.now());
  let present = initial;
  /** @type {{ path: Path, before: any, after: any, label?: string, coalesce?: string, at: number }[]} */
  let past = [];
  /** @type {typeof past} */
  let future = [];
  const has = (doc, path) => { let v = doc; for (const k of path) { if (v === null || typeof v !== "object" || !(k in v)) return false; v = v[k]; } return true; };
  return {
    get present() { return present; },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    /** @param {Command} cmd */
    apply(cmd) {
      const before = has(present, cmd.path) ? getAt(present, cmd.path) : UNDEFINED;
      const next = setAt(present, cmd.path, cmd.value);
      const t = now(), last = past[past.length - 1];
      if (cmd.coalesce && last && last.coalesce === cmd.coalesce && t - last.at <= coalesceMs && samePath(last.path, cmd.path)) {
        past[past.length - 1] = { ...last, after: cmd.value, at: t };
      } else {
        past.push({ path: cmd.path, before, after: cmd.value, label: cmd.label, coalesce: cmd.coalesce, at: t });
        if (past.length > limit) past.shift();
      }
      future = [];
      present = next;
      return present;
    },
    undo() {
      const e = past.pop(); if (!e) return present;
      present = setAt(present, e.path, e.before);
      future.push(e);
      return present;
    },
    redo() {
      const e = future.pop(); if (!e) return present;
      present = setAt(present, e.path, e.after);
      past.push(e);
      return present;
    },
    /** Replace the document without a history entry (a load, a restore); clears both stacks. @param {any} doc */
    reset(doc) { present = doc; past = []; future = []; },
    /** Labels of the steps that undo would walk, newest first. */
    get undoLabels() { return past.map(e => e.label || "").reverse(); }
  };
}

/** @param {Path} a @param {Path} b */
function samePath(a, b) { return a.length === b.length && a.every((k, i) => k === b[i]); }
