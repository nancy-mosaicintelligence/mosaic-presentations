// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHistory, getAt, setAt, ABSENT } from "../src/index.js";

const doc = () => ({ a: { b: [1, 2, { c: "x" }] }, k: "v" });

test("setAt returns a new document sharing untouched branches; getAt reads it back", () => {
  const d = doc(), n = setAt(d, ["a", "b", 2, "c"], "y");
  assert.equal(getAt(n, ["a", "b", 2, "c"]), "y");
  assert.equal(getAt(d, ["a", "b", 2, "c"]), "x");
  assert.notEqual(n.a, d.a); assert.notEqual(n.a.b, d.a.b); assert.equal(n.a.b[0], d.a.b[0]);
  assert.equal(setAt(d, ["a", "b", 0], 9).a.b[0], 9);
  assert.deepEqual(setAt(d, ["new", "deep"], 1).new, { deep: 1 });
  assert.deepEqual(setAt(d, ["a", "b", 1], ABSENT).a.b, [1, { c: "x" }]);
  assert.deepEqual(setAt(d, ["k"], ABSENT), { a: d.a });
});

test("apply, undo and redo walk the same path; a new command clears the redo stack", () => {
  const h = createHistory(doc());
  h.apply({ path: ["k"], value: "w", label: "rename" });
  h.apply({ path: ["a", "b", 0], value: 5 });
  assert.equal(h.present.k, "w"); assert.equal(h.present.a.b[0], 5);
  assert.deepEqual(h.undoLabels, ["", "rename"]);
  h.undo(); assert.equal(h.present.a.b[0], 1); assert.equal(h.canRedo, true);
  h.undo(); assert.equal(h.present.k, "v"); assert.equal(h.canUndo, false);
  h.redo(); assert.equal(h.present.k, "w");
  h.apply({ path: ["k"], value: "z" });
  assert.equal(h.canRedo, false);
  h.undo(); h.undo(); assert.deepEqual(h.present, doc());
});

test("undo of a key that did not exist removes it again", () => {
  const h = createHistory(doc());
  h.apply({ path: ["a", "extra"], value: 1 });
  assert.equal(h.present.a.extra, 1);
  h.undo();
  assert.equal("extra" in h.present.a, false);
});

test("typing coalesces into one step within the window, on the same path and key only", () => {
  let t = 0; const h = createHistory(doc(), { coalesceMs: 100, now: () => t });
  h.apply({ path: ["k"], value: "a", coalesce: "k" }); t = 50;
  h.apply({ path: ["k"], value: "ab", coalesce: "k" }); t = 90;
  h.apply({ path: ["k"], value: "abc", coalesce: "k" });
  assert.equal(h.undoLabels.length, 1);
  t = 300; h.apply({ path: ["k"], value: "abcd", coalesce: "k" });
  assert.equal(h.undoLabels.length, 2);
  h.apply({ path: ["a", "b", 0], value: 7, coalesce: "k" });
  assert.equal(h.undoLabels.length, 3);
  h.undo(); h.undo(); assert.equal(h.present.k, "abc");
  h.undo(); assert.equal(h.present.k, "v");
});

test("reset replaces the document and forgets both stacks", () => {
  const h = createHistory(doc());
  h.apply({ path: ["k"], value: "w" }); h.undo();
  h.reset({ fresh: true });
  assert.deepEqual(h.present, { fresh: true }); assert.equal(h.canUndo, false); assert.equal(h.canRedo, false);
});
