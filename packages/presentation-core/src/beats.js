// The composer's beats: what a station can be, made from the engine's own vocabulary (roles, layouts, reveals) so a
// deck composed here looks like the keynote without design work. A beat is a section plus the stations that play it.

export const STEP = 0.04;   // progress between consecutive stations of a composed deck (55 stations fit in the rail's 2.4)

/** The catalogue, in the order the picker shows it. */
export const BEATS = Object.freeze([
  { type: "opening", label: "Opening", hint: "one serif statement to start on" },
  { type: "chapter", label: "Chapter", hint: "a numbered chapter title; the rail gets a diamond" },
  { type: "statement", label: "Statement", hint: "one serif sentence, with a small lead-in above" },
  { type: "point", label: "Statement + point", hint: "the setup lands, the point arrives on the next press" },
  { type: "list", label: "List", hint: "items, one per press" },
  { type: "pills", label: "Pills", hint: "options as pills arriving in turn" },
  { type: "image", label: "Image", hint: "a picture with a caption; place the image from the Images tab" },
  { type: "number", label: "Number / quote", hint: "a large figure or quotation, with its source" },
  { type: "columns", label: "Two columns", hint: "a heading and copy on each side" },
  { type: "close", label: "Close", hint: "the closing lockup" }
]);

const t = (s) => [{ t: s }];
const station = (p, key, chapter, note, extra = {}) => ({ p, section: key, camera: "none", chapter, note, black: true, ...extra });

/**
 * A beat: its section (elements revealed at the stations' progress) and its stations.
 * @param {string} type @param {{ key: string, p: number, chapter: string, n?: number }} o
 */
export function makeBeat(type, o) {
  const { key, p, chapter } = o; const p2 = p + STEP;
  const el = (n, e) => ({ id: `${key}.${n}`, ...e });
  switch (type) {
    case "opening": return { section: { key, layout: { variants: ["mid"], width: "min(940px,76%)" }, elements: [el(1, { type: "text", role: ["hero", "strong"], runs: t("A sentence to begin on"), reveal: { p } })] }, stations: [station(p, key, chapter, "The opening.")] };
    case "chapter": return { section: { key, layout: { variants: ["mid"] }, elements: [el(1, { type: "text", role: ["chapno"], runs: t("Chapter"), reveal: { p } }), el(2, { type: "text", role: ["hero", "strong"], runs: t("The chapter's title"), reveal: { p, seq: 0.4 } })] }, stations: [station(p, key, chapter, "A new chapter.")] };
    case "statement": return { section: { key, layout: { variants: ["mid"], width: "min(940px,76%)" }, elements: [el(1, { type: "text", role: ["lede"], runs: t("A small lead-in"), reveal: { p } }), el(2, { type: "text", role: ["hero", "strong"], runs: t("The statement itself."), reveal: { p, seq: 0.5 } })] }, stations: [station(p, key, chapter, "The statement.")] };
    case "point": return { section: { key, layout: { variants: ["mid"], width: "min(940px,76%)" }, elements: [el(1, { type: "text", role: ["hero"], runs: t("The setup, which lands first."), reveal: { p } }), el(2, { type: "text", role: ["hero", "strong"], style: { marginTop: "18px" }, runs: t("The point, on the next press."), reveal: { p: p2 } })] }, stations: [station(p, key, chapter, "The setup."), station(p2, key, chapter, "The point.")] };
    case "list": { const n = o.n || 3; const items = []; const stations = []; for (let i = 0; i < n; i++) { items.push({ runs: t(`Point ${i + 1}`), reveal: { p: p + i * STEP } }); stations.push(station(p + i * STEP, key, chapter, `Point ${i + 1}.`)); }
      return { section: { key, layout: { variants: ["left", "lowcol"], width: "min(720px,60%)" }, elements: [el(1, { type: "text", role: ["lede"], runs: t("What the list is about"), reveal: { p } }), el(2, { type: "list", role: ["pts"], items })] }, stations }; }
    case "pills": { const n = o.n || 4; const items = []; for (let i = 0; i < n; i++) items.push({ runs: t(`Option ${i + 1}`), reveal: { p, seq: 1.0 + i * 0.8 } });
      return { section: { key, layout: { variants: ["mid"], width: "min(940px,76%)" }, elements: [el(1, { type: "text", role: ["lede"], runs: t("The options"), reveal: { p } }), el(2, { type: "chips", role: ["chips"], items })] }, stations: [station(p, key, chapter, "The options arrive in turn.")] }; }
    case "image": return { section: { key, layout: { variants: ["mid"], width: "min(1100px,84%)" }, elements: [el(1, { type: "text", role: ["lede"], style: { textAlign: "center" }, runs: t("A caption for the picture"), reveal: { p, seq: 0.6 } })] }, stations: [station(p, key, chapter, "Place the picture from the Images tab.")] };
    case "number": return { section: { key, layout: { variants: ["mid"], width: "min(940px,76%)" }, elements: [el(1, { type: "text", role: ["huge"], runs: t("×2"), reveal: { p } }), el(2, { type: "text", role: ["src"], runs: t("what it counts, and where it comes from"), reveal: { p, seq: 0.5 } })] }, stations: [station(p, key, chapter, "The figure.")] };
    case "columns": return { section: { key, layout: { variants: ["mid"], width: "min(1100px,84%)" }, elements: [el(1, { type: "text", role: ["lede"], runs: t("What the two sides share"), reveal: { p } }), el(2, { type: "group", role: ["cols", "rv"], reveal: { p, seq: 0.4 } }), el(3, { type: "group", role: ["col"], in: `${key}.2` }), el(4, { type: "text", role: ["big"], in: `${key}.3`, runs: t("Left") }), el(5, { type: "text", in: `${key}.3`, runs: t("The left side's copy.") }), el(6, { type: "group", role: ["col"], in: `${key}.2` }), el(7, { type: "text", role: ["big"], in: `${key}.6`, runs: t("Right") }), el(8, { type: "text", in: `${key}.6`, runs: t("The right side's copy.") })] }, stations: [station(p, key, chapter, "Two sides.")] };
    case "close": return { section: { key, layout: { variants: ["mid"] }, elements: [el(1, { type: "text", role: ["hero", "strong"], runs: t("The last word."), reveal: { p } })] }, stations: [station(p, key, chapter, "The close: the lockup arrives.", { close: true, dur: 4000 })] };
    default: throw new Error(`unknown beat ${type}`);
  }
}

/** A section key that is free in the document: the beat type plus a counter. */
export function nextKey(doc, type) { let n = 1; while (doc.sections.some((s) => s.key === `${type}${n}`)) n++; return `${type}${n}`; }

/**
 * Re-space a composed deck: stations 0, STEP, 2·STEP…, and every element's reveal that pointed at a station's
 * old progress follows it. Hand-timed decks (scene itw) are left alone.
 */
export function respace(doc) {
  if (!doc.scene || doc.scene.kind !== "plain") return doc;
  const n = doc.stations.length; const step = n > 1 ? Math.min(STEP, 2.4 / (n - 1)) : STEP;
  const map = new Map(); doc.stations.forEach((s, i) => { if (!map.has(s.p)) map.set(s.p, +(i * step).toFixed(4)); });
  const mv = (rv) => (rv && map.has(rv.p) ? { ...rv, p: map.get(rv.p) } : rv);
  return {
    ...doc,
    stations: doc.stations.map((s, i) => ({ ...s, p: +(i * step).toFixed(4) })),
    sections: doc.sections.map((sec) => ({ ...sec, elements: sec.elements.map((e) => ({ ...e, ...(e.reveal ? { reveal: mv(e.reveal) } : {}), ...(e.items ? { items: e.items.map((it) => ({ ...it, ...(it.reveal ? { reveal: mv(it.reveal) } : {}) })) } : {}) })) }))
  };
}

/**
 * A new deck on the engine: tokens and motion from the keynote, the lockup, a plain scene, an opening and a close.
 * @param {{ id: string, title: string, event?: string, tokens: any, animation: any, lockup: any, copyHud?: any }} o
 */
export function newDeckDocument(o) {
  const chapter = o.title;
  const a = makeBeat("opening", { key: "opening1", p: 0, chapter }), z = makeBeat("close", { key: "close1", p: STEP, chapter });
  a.section.elements[0].runs = t(o.title);
  return {
    schemaVersion: 7, id: o.id, title: o.title, renderer: "itw-keynote",
    scene: { kind: "plain" },
    tokens: o.tokens, animation: o.animation,
    assets: { "mosaic-lockup": o.lockup },
    copy: { road: [], team: [], sites: [], impactBars: [], senseNature: [], senseEngineering: [], annotations: [], substitution: [], fluoroscopyPlaceholders: [],
            partnerLine: o.event || "", cue: "Press → to begin", notesLabel: "Notes", safeNote: "Safe mode: the 3D stage is off.",
            hud: { safe: "Safe", notes: "Notes", present: "Present", explore: "Explore", fullscreen: "Fullscreen" } },
    sections: [a.section, z.section],
    stations: [...a.stations, ...z.stations]
  };
}
