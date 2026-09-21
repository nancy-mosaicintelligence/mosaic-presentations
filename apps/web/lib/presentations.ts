// The presentations this application knows. Paths are repository-relative: the deck file the player
// serves and the committed document the store seeds its draft from.
export interface PresentationDef { id: string; title: string; renderer: string; deckFile: string; contentFile: string; }

export const PRESENTATIONS: Record<string, PresentationDef> = {
  "italian-tech-week": {
    id: "italian-tech-week",
    title: "The Room and the Vessel — Italian Tech Week 2026",
    renderer: "itw-keynote",
    deckFile: "index.html",
    contentFile: "presentations/italian-tech-week/content/presentation.json"
  }
};

export function getPresentation(id: string): PresentationDef | null {
  return Object.prototype.hasOwnProperty.call(PRESENTATIONS, id) ? PRESENTATIONS[id] : null;
}
