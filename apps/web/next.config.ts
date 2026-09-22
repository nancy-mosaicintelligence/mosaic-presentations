import type { NextConfig } from "next";
import { join } from "node:path";

const config: NextConfig = {
  // the deck, its content and the core package live outside apps/web: trace them into every server bundle,
  // rooted at the repository so the layout (and repoRoot()) survives the copy to a function
  outputFileTracingRoot: join(__dirname, "../.."),
  outputFileTracingIncludes: { "/**": ["../../index.html", "../../pnpm-workspace.yaml", "../../presentations/italian-tech-week/content/**", "../../packages/presentation-core/src/**", "../../packages/presentation-core/package.json"] },
  // the deck is served by a route handler from the repository, and the core package is plain ESM: nothing to transpile
  transpilePackages: ["@mosaic/presentation-core"],
  // a second dev server (the browser tests) needs its own build directory; two on one .next corrupt each other
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  headers: async () => [{ source: "/(.*)", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] }]
};
export default config;
