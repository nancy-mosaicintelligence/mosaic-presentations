// @ts-check
/**
 * Presentation schema, version 1.
 *
 * The schema is expressed as data (allow-lists and field specs) so the same
 * definition drives validation, documentation and, later, the editor's
 * controls. Nothing here executes content: text is a list of runs with
 * named marks, icons are referenced by id, and custom scenes are referenced
 * by renderer id with a closed set of parameters.
 */

export const SCHEMA_VERSION = 3;

/** Inline marks a run may carry. The renderer maps each to fixed markup. */
export const MARKS = Object.freeze(["em", "strong", "i", "hl", "lead", "x2"]);

/** Icons a run may reference. The renderer owns the drawings. */
export const ICONS = Object.freeze(["drugs", "radiation", "energy", "embolic-agents", "other-therapies"]);

/** Element types a section may contain. */
export const ELEMENT_TYPES = Object.freeze(["text", "list", "chips", "chain", "loop-labels", "custom-scene", "group"]);

/** Custom scenes the Italian Tech Week renderer provides. Parameters are closed per scene. */
export const CUSTOM_SCENES = Object.freeze({
  "itw-impact-chart": { params: [] },
  "itw-sense-icons": { params: ["set"] },
  "itw-sense-tie": { params: [] },
  "itw-chalkboard": { params: [] },
  "itw-loop": { params: [] }
});

/** Section layout variants: the beat's class tokens, all defined in the renderer's stylesheet. */
export const LAYOUT_VARIANTS = Object.freeze(["mid", "left", "right", "plain", "top", "low", "lowcol", "lite", "vess", "onfield", "inroom", "orbwrap", "loopwrap"]);

/** Extra class the section's content box (.mv) may carry. */
export const MV_VARIANTS = Object.freeze(["scale-in", "scale-col", "scale-bound", "navq"]);

/** The content box width: min(<px>, <percent>) only. */
export const WIDTH_RE = /^min\(\d{2,4}px,\d{1,3}%\)$/;

/** Typographic and structural roles an element may carry (its class tokens); each is a rule in the stylesheet. */
export const ROLES = Object.freeze(["hero", "strong", "big", "huge", "lede", "lead-in", "ask", "askline", "senseh", "sensenote", "btitle", "bsynth", "loopcap", "src", "x2line", "mk",
  "vopen", "vhero", "c1", "c2", "c3", "lp", "lp1", "lp2", "lp3", "acts", "sense", "nature", "eng", "mnode", "marrow", "up", "down", "mv1", "pts", "chips", "chain", "loop", "impchart", "icons", "sensetie", "boardsk", "rv"]);

/** Inline style overrides an element may carry, and the shape a value must have (no urls, no expressions, no delimiters). */
export const STYLE_KEYS = Object.freeze(["maxWidth", "margin", "marginTop", "marginBottom", "textAlign", "fontSize", "lineHeight", "color"]);
export const SAFE_CSS_RE = /^[A-Za-z0-9#.,%()\- ]+$/;

/** Global animation values the renderer reads. Ranges keep an edit from breaking the deck. */
export const ANIMATION_FIELDS = Object.freeze({
  revealSpacing: { type: "number", req: true, min: 0, max: 3 },      // seconds between sequenced reveals
  revealFade: { type: "number", req: true, min: 0.05, max: 3 },      // seconds a reveal takes to arrive
  stepMin: { type: "number", req: true, min: 100, max: 5000 },       // ms, shortest ordinary step
  stepMax: { type: "number", req: true, min: 100, max: 10000 },      // ms, longest ordinary step
  stepPerUnit: { type: "number", req: true, min: 1000, max: 60000 }, // ms per unit of progress
  stepEaseOut: { type: "number", req: true, min: 0, max: 1 }         // share of ease-out in an ordinary step
});

/** Camera targets a station may name (the renderer's OBJ table). */
export const CAMERA_TARGETS = Object.freeze(["none", "mon", "rig", "tab", "pat", "vasc", "acc"]);

/** Colour tokens: hex or rgba() only. */
export const COLOR_RE = /^(#[0-9A-Fa-f]{6}|rgba\(\d{1,3},\d{1,3},\d{1,3},(0|1|0?\.\d+)\))$/;

/** A font stack: quoted family names and bare generic names, comma separated. */
export const FONT_STACK_RE = /^("[A-Za-z0-9 \-]+"|[A-Za-z\-]+)(,("[A-Za-z0-9 \-]+"|[A-Za-z\-]+))*$/;

/**
 * Field specs. `req` marks required fields; every other key is optional.
 * Types: "string" | "number" | "boolean" | "runs" | "list" | "object" | {enum:[...]} | {re:RegExp} | {array: spec}
 */
export const PRESENTATION_FIELDS = Object.freeze({
  schemaVersion: { type: "number", req: true },
  id: { type: "string", req: true },
  title: { type: "string", req: true },
  renderer: { type: "string", req: true },
  meta: { type: "object" },
  tokens: { type: "object", req: true },
  copy: { type: "object", req: true },
  animation: { type: "object" },
  assets: { type: "object" },
  sections: { type: "array", req: true },
  stations: { type: "array", req: true }
});

export const TOKEN_FIELDS = Object.freeze({
  colors: { type: "object", req: true },
  fonts: { type: "object", req: true }
});

export const SECTION_FIELDS = Object.freeze({
  key: { type: "string", req: true },
  layout: { type: "object" },
  elements: { type: "array", req: true }
});

export const LAYOUT_FIELDS = Object.freeze({
  variants: { type: { arrayOf: { enum: LAYOUT_VARIANTS } } },
  width: { type: { re: WIDTH_RE } },
  box: { type: { enum: MV_VARIANTS } },
  until: { type: "number" }
});

export const ELEMENT_FIELDS = Object.freeze({
  id: { type: "string", req: true },
  type: { type: { enum: ELEMENT_TYPES }, req: true },
  runs: { type: "runs" },        // text
  items: { type: "array" },      // list, chips, chain, loop-labels: each item is runs (+ reveal)
  reveal: { type: "reveal" },
  role: { type: { arrayOf: { enum: ROLES } } },
  style: { type: "object" },
  scene: { type: { enum: Object.keys(CUSTOM_SCENES) } },
  params: { type: "object" }
});

export const RUN_FIELDS = Object.freeze({
  t: { type: "string" },
  marks: { type: { arrayOf: { enum: MARKS } } },
  icon: { type: { enum: ICONS } },
  reveal: { type: "reveal" }
});

export const REVEAL_FIELDS = Object.freeze({
  p: { type: "number", req: true },
  seq: { type: "number" }
});

export const STATION_FIELDS = Object.freeze({
  p: { type: "number", req: true },
  section: { type: "string", req: true },   // "" for a station with no text
  camera: { type: { enum: CAMERA_TARGETS }, req: true },
  chapter: { type: "string", req: true },
  note: { type: "string", req: true },
  dur: { type: "number" },
  black: { type: "boolean" },
  road: { type: "boolean" },
  lite: { type: "boolean" },
  vessel: { type: "boolean" }
});

/** The copy that the renderer draws itself (canvas, SVG, generated DOM). Each is a list of strings or runs. */
export const COPY_FIELDS = Object.freeze({
  road: { type: "array", req: true },        // [{year: runs, text: runs}]
  team: { type: { arrayOf: "string" }, req: true },
  sites: { type: { arrayOf: "string" }, req: true },
  impactBars: { type: { arrayOf: "string" }, req: true },
  senseNature: { type: { arrayOf: "string" }, req: true },
  senseEngineering: { type: { arrayOf: "string" }, req: true },
  annotations: { type: { arrayOf: "string" }, req: true },
  substitution: { type: "runs", req: true },
  fluoroscopyPlaceholders: { type: { arrayOf: "string" }, req: true },
  partnerLine: { type: "string", req: true },
  cue: { type: "string", req: true },
  notesLabel: { type: "string", req: true },
  safeNote: { type: "string", req: true },
  hud: { type: "object", req: true }
});

/** Assets: vector geometry the renderer draws itself, with the files it was taken from. */
export const ASSET_KINDS = Object.freeze(["svg-paths"]);
export const ASSET_FIELDS = Object.freeze({
  kind: { type: { enum: ASSET_KINDS }, req: true },
  use: { type: "string" },
  viewBox: { type: { re: /^-?\d+(\.\d+)? -?\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/ }, req: true },
  paths: { type: "array", req: true },
  sources: { type: "array", req: true }
});
export const ASSET_PATH_FIELDS = Object.freeze({ d: { type: { re: /^[MmZzLlHhVvCcSsQqTtAa0-9,.\-+eE \n]+$/ }, req: true } });
export const ASSET_SOURCE_FIELDS = Object.freeze({
  path: { type: { re: /^(?!\/)(?!.*(^|\/)\.\.(\/|$))[A-Za-z0-9_\-./]+\.svg$/ }, req: true },
  sha256: { type: { re: /^[0-9a-f]{64}$/ }, req: true }
});
