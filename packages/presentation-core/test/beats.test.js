import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate, BEATS, makeBeat, newDeckDocument, respace, nextKey, STEP } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const itw = JSON.parse(readFileSync(join(here, "..", "..", "..", "presentations/italian-tech-week/content/presentation.json"), "utf8"));
const fresh = () => newDeckDocument({ id: "t", title: "A deck", event: "Somewhere, 2027", tokens: itw.tokens, animation: itw.animation, lockup: itw.assets["mosaic-lockup"] });

test("a new deck validates: a plain scene, the lockup, an opening and a close", () => {
  const d = fresh(); const r = validate(d);
  assert.deepEqual(r.errors, []); assert.equal(d.scene.kind, "plain"); assert.equal(d.stations.length, 2); assert.equal(d.stations[1].close, true);
  assert.equal(d.sections[0].elements[0].runs[0].t, "A deck");
});

test("every beat in the catalogue makes a section that validates inside a deck, with its stations", () => {
  for (const b of BEATS) {
    const d = fresh(); const key = nextKey(d, b.type); const made = makeBeat(b.type, { key, p: 0.5, chapter: "Ch" });
    d.sections.push(made.section); d.stations.splice(1, 0, ...made.stations);
    const r = validate(respace(d));
    assert.deepEqual(r.errors, [], b.type);
    assert.ok(made.stations.length >= 1 && made.stations.every(s => s.section === key), b.type);
  }
  assert.equal(makeBeat("point", { key: "k", p: 0.5, chapter: "c" }).stations.length, 2);
  assert.equal(makeBeat("list", { key: "k", p: 0.5, chapter: "c", n: 4 }).stations.length, 4);
  assert.throws(() => makeBeat("nope", { key: "k", p: 0, chapter: "c" }));
});

test("respace lays stations out at STEP and moves every reveal with its station; the keynote is left alone", () => {
  const d = fresh(); const b = makeBeat("list", { key: "list1", p: 0.9, chapter: "c", n: 3 });
  d.sections.splice(1, 0, b.section); d.stations.splice(1, 0, ...b.stations);
  const r = respace(d);
  assert.deepEqual(r.stations.map(s => s.p), [0, STEP, 2 * STEP, 3 * STEP, 4 * STEP].map(x => +x.toFixed(4)));
  const list = r.sections[1].elements[1]; assert.deepEqual(list.items.map(i => i.reveal.p), [STEP, 2 * STEP, 3 * STEP].map(x => +x.toFixed(4)));
  assert.equal(r.sections[2].elements[0].reveal.p, +(4 * STEP).toFixed(4), "the close moved too");
  assert.equal(respace(itw), itw);
  const many = fresh(); for (let i = 0; i < 80; i++) { const k = nextKey(many, "statement"); const m = makeBeat("statement", { key: k, p: 1, chapter: "c" }); many.sections.push(m.section); many.stations.splice(1, 0, ...m.stations); }
  assert.ok(respace(many).stations[81].p <= 2.4, "many stations still fit the rail");
});

test("nextKey never collides", () => { const d = fresh(); assert.equal(nextKey(d, "opening"), "opening2"); assert.equal(nextKey(d, "list"), "list1"); });
