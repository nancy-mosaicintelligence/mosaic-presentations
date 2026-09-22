// Light types over the structured document (the schema in packages/presentation-core is the authority).
export type Reveal = { p: number; seq?: number };
export type Run = { t?: string; marks?: string[]; icon?: string; reveal?: Reveal };
export type Item = { runs: Run[]; reveal?: Reveal };
export type ImageSize = { width?: string; align?: "left" | "center" | "right"; radius?: number };
export type ImageAdjust = { crop?: { x: number; y: number; w: number; h: number }; rotate?: 0 | 90 | 180 | 270; flipH?: boolean; flipV?: boolean; brightness?: number; contrast?: number; saturate?: number; opacity?: number; blur?: number };
export type Element = { id: string; type: string; runs?: Run[]; items?: Item[]; reveal?: Reveal; hidden?: boolean; role?: string[]; style?: Record<string, string>; scene?: string; params?: Record<string, string>; asset?: string; alt?: string; size?: ImageSize; adjust?: ImageAdjust; in?: string; place?: { x: number; y: number; w: number }; nudge?: { dx: number; dy: number }; frame?: { w: number; h: number } };
export type Layout = { variants?: string[]; width?: string; box?: string; until?: number };
export type Section = { key: string; layout?: Layout; elements: Element[] };
export type Station = { p: number; section: string; camera: string; chapter: string; note: string; dur?: number; black?: boolean; road?: boolean; lite?: boolean; vessel?: boolean; close?: boolean };
export type Element_in = { in?: string };
export type Asset = { kind: string; use?: string; viewBox: string; paths: { d: string }[]; sources: { path: string; sha256: string }[] };
export type Doc = { schemaVersion: number; id: string; title: string; renderer: string; scene?: { kind: "itw" | "plain" }; tokens: any; copy: any; animation?: Record<string, number>; assets?: Record<string, Asset>; sections: Section[]; stations: Station[]; meta?: any };
export type Path = (string | number)[];
export type Command = { path: Path; value: any; label?: string; coalesce?: string };

export function locate(doc: Doc, id: string | null): { si: number; ei: number; section: Section; element: Element } | null {
  if (!id) return null;
  for (let si = 0; si < doc.sections.length; si++) { const ei = doc.sections[si].elements.findIndex(e => e.id === id); if (ei >= 0) return { si, ei, section: doc.sections[si], element: doc.sections[si].elements[ei] }; }
  return null;
}
/** Plain text of runs, for labels. */
export function plain(runs: Run[] | undefined): string { return (runs || []).map(r => r.t ?? (r.icon ? `[${r.icon}]` : "")).join(""); }
/** Which paths the framed deck cannot take live: it reads these at start-up, so the player reloads. */
export function needsReload(path: Path): boolean { const head = String(path[0]); return head === "copy" || head === "assets" || (head === "tokens" && path[1] === "fonts"); }
