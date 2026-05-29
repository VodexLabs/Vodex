/** Tracks whether build_job_events is reachable (admin + runtime warnings). */
let buildEventsTableMissing = false;
let warnedOnce = false;

export function markBuildJobEventsTableMissing(missing: boolean): void {
  buildEventsTableMissing = missing;
}

export function isBuildJobEventsTableMissing(): boolean {
  return buildEventsTableMissing;
}

export function buildJobEventsSetupWarning(): string {
  return "build_job_events table is not available. Apply migration 20260703120000_p05_build_events_model_decision_repair.sql and reload PostgREST schema.";
}

export function logBuildEventsSetupWarningOnce(): void {
  if (!buildEventsTableMissing || warnedOnce) return;
  warnedOnce = true;
  console.warn("[build-events] setup_warning:", buildJobEventsSetupWarning());
}

export function isBuildEventsSchemaError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("build_job_events") &&
    (m.includes("does not exist") ||
      m.includes("schema cache") ||
      m.includes("could not find the table") ||
      m.includes("pgrst205"))
  );
}
