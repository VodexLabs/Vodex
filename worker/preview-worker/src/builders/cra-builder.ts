import { buildVite } from "./vite-builder.js";
import type { FrameworkInfo } from "../framework.js";
import type { WorkspaceFile } from "../sandbox.js";

/** CRA uses build/ output — vite-builder resolves via framework id passed separately in job-runner */
export async function buildCra(root: string, framework: FrameworkInfo, files: WorkspaceFile[]) {
  return buildVite(root, framework, files);
}
