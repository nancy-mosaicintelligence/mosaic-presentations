import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** The repository root: the nearest ancestor of the working directory that holds the workspace file. */
export function repoRoot(): string {
  let dir = resolve(process.cwd());
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const up = dirname(dir); if (up === dir) break; dir = up;
  }
  throw new Error("repository root not found (no pnpm-workspace.yaml above " + process.cwd() + ")");
}
