import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** The repository root: the nearest ancestor of the working directory — or, in a deployed function where the working
 *  directory is elsewhere, of this module — that holds the workspace file. `MOSAIC_REPO_ROOT` names it outright. */
export function repoRoot(): string {
  if (process.env.MOSAIC_REPO_ROOT && existsSync(join(process.env.MOSAIC_REPO_ROOT, "pnpm-workspace.yaml"))) return process.env.MOSAIC_REPO_ROOT;
  const starts = [resolve(process.cwd()), resolve(__dirname)];
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
      const up = dirname(dir); if (up === dir) break; dir = up;
    }
  }
  throw new Error("repository root not found (no pnpm-workspace.yaml above " + starts.join(" or ") + ")");
}
