import type { BuildJobEventRow } from "@/lib/build/build-job-events";

/** Ephemeral client-side steps when the server is quiet (no fake completed work). */
export const EPHEMERAL_BUILD_MICRO_STEPS = [
  "Reading your request",
  "Detecting app type",
  "Choosing app structure",
  "Planning pages",
  "Planning data model",
  "Checking existing files",
  "Checking imports",
  "Checking responsive layout",
  "Preparing preview",
  "Running quality checks",
  "Saving files",
] as const;

export const EPHEMERAL_EDIT_MICRO_STEPS = [
  "Reading current project",
  "Viewing file tree",
  "Comparing requested change",
  "Checking affected routes",
  "Updating preview",
  "Saving checkpoint",
] as const;

export function pickEphemeralMicroStep(
  seed: number,
  editing = false,
): string {
  const list = editing ? EPHEMERAL_EDIT_MICRO_STEPS : EPHEMERAL_BUILD_MICRO_STEPS;
  return list[Math.abs(seed) % list.length] ?? list[0];
}

export function microLabelFromServerEvent(ev: BuildJobEventRow): string {
  if (ev.file_path) {
    const name = ev.file_path.split("/").pop() ?? ev.file_path;
    return `${ev.title} — ${name}`;
  }
  return ev.title;
}
