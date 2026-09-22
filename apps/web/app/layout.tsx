import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Mosaic · presentations", robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><head>
    <link rel="icon" href="/brand/mosaic-icon-orange.svg" type="image/svg+xml" />
    {/* the keynote's own type — Fraunces for titles, DM Sans for everything else — so the app reads like the decks it holds */}
    <link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&display=swap" />
  </head><body>{children}</body></html>;
}
