import {
  SCHEMA_VERSION, PRESENTATION_FIELDS, TOKEN_FIELDS, SECTION_FIELDS, ELEMENT_FIELDS,
  RUN_FIELDS, REVEAL_FIELDS, STATION_FIELDS, COPY_FIELDS, CUSTOM_SCENES,
  COLOR_RE, FONT_STACK_RE, LAYOUT_FIELDS, ANIMATION_FIELDS, STYLE_KEYS, safeCss, ASSET_FIELDS, IMAGE_ASSET_FIELDS, IMAGE_SIZE_FIELDS, IMAGE_ADJUST_FIELDS, ASSET_PATH_FIELDS, ASSET_SOURCE_FIELDS } from "./schema.js";

/**
 * @typedef {{ path: string, message: string }} Issue
 * @typedef {{ ok: boolean, errors: Issue[] }} Result
 */

/**
 * Validate a presentation document against schema v1.
 * Strict: unknown fields, unknown element types, unknown marks, unknown
 * scenes or parameters, and malformed tokens are all errors.
 * @param {unknown} doc
 * @returns {Result}
 */
export function validate(doc) {
  /** @type {Issue[]} */
  const errors = [];
  const err = (path, message) => errors.push({ path, message });

  if (!isObj(doc)) return { ok: false, errors: [{ path: "", message: "document must be an object" }] };
  const d = /** @type {Record<string, any>} */ (doc);
  checkFields(d, PRESENTATION_FIELDS, "", err);
  if (d.schemaVersion !== SCHEMA_VERSION) err("schemaVersion", `expected ${SCHEMA_VERSION}, got ${d.schemaVersion}`);

  // tokens
  if (isObj(d.tokens)) {
    checkFields(d.tokens, TOKEN_FIELDS, "tokens", err);
    if (isObj(d.tokens.colors)) for (const [k, v] of Object.entries(d.tokens.colors)) {
      if (!/^[a-z][a-z0-9-]*$/.test(k)) err(`tokens.colors.${k}`, "token names are lower-case kebab");
      if (typeof v !== "string" || !COLOR_RE.test(v)) err(`tokens.colors.${k}`, "must be #rrggbb or rgba(r,g,b,a)");
    }
    if (isObj(d.tokens.fonts)) for (const [k, v] of Object.entries(d.tokens.fonts)) {
      if (!/^[a-z][a-z0-9-]*$/.test(k)) err(`tokens.fonts.${k}`, "token names are lower-case kebab");
      if (typeof v !== "string" || !FONT_STACK_RE.test(v)) err(`tokens.fonts.${k}`, "must be a comma-separated font stack of quoted families and generic names");
    }
  }

  // copy
  if (isObj(d.copy)) {
    checkFields(d.copy, COPY_FIELDS, "copy", err);
    if (Array.isArray(d.copy.road)) d.copy.road.forEach((m, i) => {
      if (!isObj(m)) return err(`copy.road[${i}]`, "must be an object");
      checkFields(m, { year: { type: "runs", req: true }, text: { type: "runs", req: true } }, `copy.road[${i}]`, err);
      checkRuns(m.year, `copy.road[${i}].year`, err); checkRuns(m.text, `copy.road[${i}].text`, err);
    });
    if (d.copy.substitution !== undefined) checkRuns(d.copy.substitution, "copy.substitution", err);
    if (isObj(d.copy.hud)) checkFields(d.copy.hud, { safe: { type: "string", req: true }, notes: { type: "string", req: true }, present: { type: "string", req: true }, explore: { type: "string", req: true }, fullscreen: { type: "string", req: true } }, "copy.hud", err);
  }

  // assets: a closed kind, path data and a viewBox matched against strict grammars, sources as repo-relative files with hashes
  if (d.assets !== undefined) {
    if (!isObj(d.assets)) err("assets", "must be an object");
    else for (const [id, a] of Object.entries(d.assets)) {
      const ap = `assets.${id}`;
      if (!/^[a-z][a-z0-9-]*$/.test(id)) err(ap, "asset ids are lower-case kebab");
      if (!isObj(a)) { err(ap, "must be an object"); continue; }
      if (a.kind === "image") { checkFields(a, IMAGE_ASSET_FIELDS, ap, err); for (const k of ["width", "height"]) if (typeof a[k] === "number" && (!Number.isInteger(a[k]) || a[k] < 1 || a[k] > 20000)) err(`${ap}.${k}`, "must be a whole number of pixels"); continue; }
      checkFields(a, ASSET_FIELDS, ap, err);
      if (Array.isArray(a.paths)) { if (!a.paths.length) err(`${ap}.paths`, "needs at least one path"); a.paths.forEach((pt, i) => { if (!isObj(pt)) return err(`${ap}.paths[${i}]`, "must be an object"); checkFields(pt, ASSET_PATH_FIELDS, `${ap}.paths[${i}]`, err); }); }
      if (Array.isArray(a.sources)) { if (!a.sources.length) err(`${ap}.sources`, "needs at least one source file"); a.sources.forEach((src, i) => { if (!isObj(src)) return err(`${ap}.sources[${i}]`, "must be an object"); checkFields(src, ASSET_SOURCE_FIELDS, `${ap}.sources[${i}]`, err); }); }
    }
  }

  // scene
  if (d.scene !== undefined) { if (!isObj(d.scene)) err("scene", "must be an object"); else { checkFields(d.scene, { kind: { type: { enum: ["itw", "plain"] }, req: true } }, "scene", err); } }

  // animation
  if (d.animation !== undefined) {
    if (!isObj(d.animation)) err("animation", "must be an object");
    else {
      checkFields(d.animation, ANIMATION_FIELDS, "animation", err);
      for (const [k, spec] of Object.entries(ANIMATION_FIELDS)) { const v = d.animation[k]; if (typeof v === "number" && (v < spec.min || v > spec.max)) err(`animation.${k}`, `must be between ${spec.min} and ${spec.max}`); }
      if (typeof d.animation.stepMin === "number" && typeof d.animation.stepMax === "number" && d.animation.stepMin > d.animation.stepMax) err("animation.stepMax", "must be at least stepMin");
    }
  }

  // sections
  const keys = new Set();
  const ids = new Set();
  if (Array.isArray(d.sections)) d.sections.forEach((s, i) => {
    const sp = `sections[${i}]`;
    if (!isObj(s)) return err(sp, "must be an object");
    checkFields(s, SECTION_FIELDS, sp, err);
    if (typeof s.key === "string") { if (keys.has(s.key)) err(`${sp}.key`, `duplicate section key "${s.key}"`); keys.add(s.key); }
    if (s.layout !== undefined) { if (!isObj(s.layout)) err(`${sp}.layout`, "must be an object"); else checkFields(s.layout, LAYOUT_FIELDS, `${sp}.layout`, err); }
    if (Array.isArray(s.elements)) s.elements.forEach((e, j) => {
      const ep = `${sp}.elements[${j}]`;
      if (!isObj(e)) return err(ep, "must be an object");
      checkFields(e, ELEMENT_FIELDS, ep, err);
      if (typeof e.id === "string") { if (ids.has(e.id)) err(`${ep}.id`, `duplicate element id "${e.id}"`); ids.add(e.id); }
      if (e.in !== undefined) { const host = s.elements.slice(0, j).find((x) => x && x.id === e.in); if (!host) err(`${ep}.in`, "must name a group earlier in the same section"); else if (host.type !== "group") err(`${ep}.in`, "must name a group"); }
      switch (e.type) {
        case "text":
          if (!Array.isArray(e.runs)) err(`${ep}.runs`, "text needs runs"); else checkRuns(e.runs, `${ep}.runs`, err);
          if (e.items !== undefined) err(`${ep}.items`, "text does not take items");
          break;
        case "list": case "chips": case "chain": case "loop-labels":
          if (!Array.isArray(e.items)) err(`${ep}.items`, `${e.type} needs items`);
          else e.items.forEach((it, k) => {
            const ip = `${ep}.items[${k}]`;
            if (!isObj(it)) return err(ip, "must be an object");
            checkFields(it, { runs: { type: "runs", req: true }, reveal: { type: "reveal" } }, ip, err);
            checkRuns(it.runs, `${ip}.runs`, err);
            if (it.reveal !== undefined) checkReveal(it.reveal, `${ip}.reveal`, err);
          });
          if (e.runs !== undefined) err(`${ep}.runs`, `${e.type} does not take runs`);
          break;
        case "group":
          if (e.runs !== undefined || e.items !== undefined) err(ep, "a group carries no copy of its own");
          break;
        case "image": {
          if (typeof e.asset !== "string") err(`${ep}.asset`, "an image names its asset");
          else if (!isObj(d.assets) || !isObj(d.assets[e.asset]) || d.assets[e.asset].kind !== "image") err(`${ep}.asset`, `no image asset "${e.asset}"`);
          if (e.runs !== undefined || e.items !== undefined) err(ep, "an image carries no copy");
          if (e.size !== undefined) { if (!isObj(e.size)) err(`${ep}.size`, "must be an object"); else { checkFields(e.size, IMAGE_SIZE_FIELDS, `${ep}.size`, err); if (typeof e.size.radius === "number" && (e.size.radius < 0 || e.size.radius > 80)) err(`${ep}.size.radius`, "must be between 0 and 80"); } }
          if (e.adjust !== undefined) {
            if (!isObj(e.adjust)) err(`${ep}.adjust`, "must be an object");
            else {
              checkFields(e.adjust, IMAGE_ADJUST_FIELDS, `${ep}.adjust`, err);
              for (const [k, spec] of Object.entries(IMAGE_ADJUST_FIELDS)) { const v = e.adjust[k]; if (typeof v === "number" && spec.min !== undefined && (v < spec.min || v > spec.max)) err(`${ep}.adjust.${k}`, `must be between ${spec.min} and ${spec.max}`); }
              const c = e.adjust.crop;
              if (c !== undefined) { if (!isObj(c)) err(`${ep}.adjust.crop`, "must be an object"); else { checkFields(c, { x: { type: "number", req: true }, y: { type: "number", req: true }, w: { type: "number", req: true }, h: { type: "number", req: true } }, `${ep}.adjust.crop`, err); for (const k of ["x", "y", "w", "h"]) if (typeof c[k] === "number" && (c[k] < 0 || c[k] > 1)) err(`${ep}.adjust.crop.${k}`, "fractions of the source, 0 to 1"); if (typeof c.w === "number" && typeof c.x === "number" && c.x + c.w > 1.0001) err(`${ep}.adjust.crop.w`, "the crop leaves the source"); if (typeof c.h === "number" && typeof c.y === "number" && c.y + c.h > 1.0001) err(`${ep}.adjust.crop.h`, "the crop leaves the source"); if ((typeof c.w === "number" && c.w < 0.01) || (typeof c.h === "number" && c.h < 0.01)) err(`${ep}.adjust.crop`, "the crop is too small"); } }
            }
          }
          break;
        }
        case "custom-scene": {
          if (typeof e.scene !== "string" || !(e.scene in CUSTOM_SCENES)) err(`${ep}.scene`, "unknown custom scene");
          else {
            const allowed = CUSTOM_SCENES[/** @type {keyof typeof CUSTOM_SCENES} */ (e.scene)].params;
            if (e.params !== undefined) { if (!isObj(e.params)) err(`${ep}.params`, "must be an object"); else for (const k of Object.keys(e.params)) if (!allowed.includes(k)) err(`${ep}.params.${k}`, `parameter not allowed for ${e.scene}`); }
          }
          if (e.runs !== undefined || e.items !== undefined) err(ep, "custom-scene carries no copy");
          break;
        }
        default: /* type errors already reported */ break;
      }
      if (e.reveal !== undefined) checkReveal(e.reveal, `${ep}.reveal`, err);
      if (e.style !== undefined) {
        if (!isObj(e.style)) err(`${ep}.style`, "must be an object");
        else for (const [k, v] of Object.entries(e.style)) {
          if (!STYLE_KEYS.includes(k)) err(`${ep}.style.${k}`, "style property not allowed");
          else if (!safeCss(v)) err(`${ep}.style.${k}`, "malformed style value");
        }
      }
    });
  });

  // stations
  if (Array.isArray(d.stations)) {
    let last = -Infinity;
    d.stations.forEach((s, i) => {
      const sp = `stations[${i}]`;
      if (!isObj(s)) return err(sp, "must be an object");
      checkFields(s, STATION_FIELDS, sp, err);
      if (typeof s.p === "number") { if (!(s.p > last)) err(`${sp}.p`, "stations must be in strictly increasing progress order"); last = s.p; }
      if (typeof s.section === "string" && s.section !== "" && !keys.has(s.section)) err(`${sp}.section`, `no section with key "${s.section}"`);
      if (s.dur !== undefined && !(s.dur >= 200 && s.dur <= 20000)) err(`${sp}.dur`, "dur must be 200–20000 ms");
    });
    if (d.stations.length === 0) err("stations", "at least one station");
  }

  return { ok: errors.length === 0, errors };
}

/** @param {unknown} v */
function isObj(v) { return typeof v === "object" && v !== null && !Array.isArray(v); }

/**
 * @param {Record<string, any>} obj
 * @param {Record<string, {type:any, req?:boolean}>} fields
 * @param {string} path
 * @param {(p:string,m:string)=>void} err
 */
function checkFields(obj, fields, path, err) {
  const at = (k) => (path ? `${path}.${k}` : k);
  for (const k of Object.keys(obj)) if (!(k in fields)) err(at(k), "unsupported field");
  for (const [k, spec] of Object.entries(fields)) {
    const v = obj[k];
    if (v === undefined) { if (spec.req) err(at(k), "required"); continue; }
    checkType(v, spec.type, at(k), err);
  }
}

/** @param {any} v @param {any} type @param {string} path @param {(p:string,m:string)=>void} err */
function checkType(v, type, path, err) {
  if (type === "string") { if (typeof v !== "string") err(path, "must be a string"); return; }
  if (type === "number") { if (typeof v !== "number" || !Number.isFinite(v)) err(path, "must be a finite number"); return; }
  if (type === "boolean") { if (typeof v !== "boolean") err(path, "must be a boolean"); return; }
  if (type === "object") { if (!isObj(v)) err(path, "must be an object"); return; }
  if (type === "array") { if (!Array.isArray(v)) err(path, "must be an array"); return; }
  if (type === "runs") { if (!Array.isArray(v)) err(path, "must be an array of runs"); return; }
  if (type === "reveal") { if (!isObj(v)) err(path, "must be a reveal object"); return; }
  if (isObj(type) && type.enum) { if (!type.enum.includes(v)) err(path, `must be one of ${type.enum.join(", ")}`); return; }
  if (isObj(type) && type.arrayOf) {
    if (!Array.isArray(v)) return err(path, "must be an array");
    v.forEach((x, i) => checkType(x, type.arrayOf, `${path}[${i}]`, err));
    return;
  }
  if (isObj(type) && type.re) { if (typeof v !== "string" || !type.re.test(v)) err(path, "malformed"); return; }
  err(path, "unknown spec");
}

/** @param {unknown} runs @param {string} path @param {(p:string,m:string)=>void} err */
function checkRuns(runs, path, err) {
  if (!Array.isArray(runs)) return err(path, "must be an array of runs");
  runs.forEach((r, i) => {
    const rp = `${path}[${i}]`;
    if (!isObj(r)) return err(rp, "run must be an object");
    checkFields(r, RUN_FIELDS, rp, err);
    const hasT = typeof r.t === "string", hasIcon = typeof r.icon === "string";
    if (!hasT && !hasIcon) err(rp, "run needs t (text) or icon");
    if (hasT && /[<>]/.test(r.t)) err(`${rp}.t`, "text must not contain markup");
    if (r.reveal !== undefined) checkReveal(r.reveal, `${rp}.reveal`, err);
  });
}

/** @param {unknown} rv @param {string} path @param {(p:string,m:string)=>void} err */
function checkReveal(rv, path, err) {
  if (!isObj(rv)) return err(path, "must be an object");
  checkFields(/** @type {any} */ (rv), REVEAL_FIELDS, path, err);
}
