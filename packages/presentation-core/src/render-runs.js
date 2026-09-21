// @ts-check
/**
 * Runs → HTML. This is the reference implementation; the keynote embeds an
 * identical copy (its `renderRuns`) because it must stay a single file, and a
 * test asserts the two are the same text. Only the marks and icons named in
 * the schema produce markup; text is always escaped.
 */

/** @type {Record<string, [string, string]>} mark → [open, close] */
const MARK_TAGS = {
  em: ["<em>", "</em>"],
  strong: ["<b>", "</b>"],
  i: ["<i>", "</i>"],
  hl: ['<em class="hl" id="hlVasc">', "</em>"],
  lead: ['<b class="lead">', "</b>"],
  x2: ['<b class="x2">', "</b>"]
};

/** @type {Record<string, string>} icon id → inline SVG (owned by the renderer, never by content) */
const ICON_SVG = {
  "drugs": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 3.5l12 12a3.5 3.5 0 0 1-5 5l-12-12a3.5 3.5 0 0 1 5-5zM9.5 9.5l5 5"/></svg>',
  "radiation": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2"/><path d="M12 10V3M13.7 13l6 3.5M10.3 13l-6 3.5M7.5 4.4a9 9 0 0 1 9 0M20.2 9.3a9 9 0 0 1 0 5.4M3.8 9.3a9 9 0 0 0 0 5.4"/></svg>',
  "energy": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L5 13h6l-1 9 8-11h-6z"/></svg>',
  "embolic-agents": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="14" r="2.3"/><circle cx="12" cy="8" r="2.3"/><circle cx="17" cy="14" r="2.3"/><circle cx="12" cy="18" r="2.3"/></svg>',
  "other-therapies": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v9M7.5 12h9"/></svg>'
};

/** @param {string} s */
function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

/**
 * @param {Array<{t?:string, marks?:string[], icon?:string, reveal?:{p:number, seq?:number}}>} runs
 * @returns {string}
 */
export function renderRuns(runs) {
  var out = "";
  for (var i = 0; i < runs.length; i++) {
    var r = runs[i], inner = "";
    if (r.icon && ICON_SVG[r.icon]) inner += ICON_SVG[r.icon];
    if (typeof r.t === "string") inner += esc(r.t);
    var marks = r.marks || [];
    for (var m = marks.length - 1; m >= 0; m--) { var tag = MARK_TAGS[marks[m]]; if (tag) inner = tag[0] + inner + tag[1]; }
    if (r.reveal) {
      inner = '<span class="rv" data-p="' + Number(r.reveal.p) + '"' + (r.reveal.seq !== undefined ? ' data-seq="' + Number(r.reveal.seq) + '"' : "") + ">" + inner + "</span>";
    }
    out += inner;
  }
  return out;
}
