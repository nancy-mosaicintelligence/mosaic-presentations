/**
 * The Mosaic brand marks, shipped with the app under /brand and offered in every presentation's
 * image library. They are image assets like any upload (the schema allows an SVG only here), so
 * they are placed, moved, resized and adjusted the same way; the files never leave the app's origin.
 */
import type { ImageAsset } from "@/components/editor/Images";

export const BRAND_ORANGE = "#FC6452";
export const BRAND_INK = "#1A1815";

export type BrandAsset = ImageAsset & { on: "dark" | "light" };

const mark = (id: string, file: string, name: string, sha256: string, width: number, height: number, on: "dark" | "light"): BrandAsset =>
  ({ id, kind: "image", src: `/brand/${file}`, sha256, width, height, mime: "image/svg+xml", name, alt: name, on });

/** In the order the library shows them: the lockups first, then the icon alone. */
export const BRAND_ASSETS: BrandAsset[] = [
  mark("brand-logo-white", "mosaic-logo-white.svg", "Mosaic logo, white", "586db456e5ce8c506cca926eda0cc6dcbe8f8559a51c03f4cef82499859b58a3", 546, 150, "dark"),
  mark("brand-logo-colour", "mosaic-logo-colour.svg", "Mosaic logo, colour", "d369451fa20a7ae5e53de014408cff27b55e78bf8027bb6bf8800f45b7f0522c", 546, 150, "light"),
  mark("brand-logo-black", "mosaic-logo-black.svg", "Mosaic logo, black", "2fefd7b1dd33a6fb362ee2854f02dab26cd468b6de65bcfeabd2f20939588b4c", 546, 150, "light"),
  mark("brand-icon-white", "mosaic-icon-white.svg", "Mosaic icon, white", "09ade504ed155d7c189524260a3498c9ea35277dd2cfba175dd4373b43fbaf82", 122, 150, "dark"),
  mark("brand-icon-orange", "mosaic-icon-orange.svg", "Mosaic icon, orange", "045a552542d3befc2ad4cdee1046a78742cb24cf143c4ab3f7043b27625bdd7a", 122, 150, "dark"),
  mark("brand-icon-black", "mosaic-icon-black.svg", "Mosaic icon, black", "cdb8234159bd2effdbedd6fa113b1c5efd1e29829eee1bff042dcb6f0f21757a", 122, 150, "light")
];
