/**
 * Audit registry — generated-app runtime provider paths vs owner metering.
 * Update when wiring new provider endpoints.
 */

export type RuntimeMeteringStatus =
  | "metered"
  | "partial"
  | "not_implemented"
  | "free_by_design";

export type RuntimeMeteringRow = {
  path: string;
  feature: string;
  status: RuntimeMeteringStatus;
  charges: "owner" | "visitor" | "none";
  precheck: boolean;
  notes: string;
};

export const RUNTIME_METERING_COVERAGE: RuntimeMeteringRow[] = [
  {
    path: "src/lib/contact/save-contact-request.ts",
    feature: "Contact form notification email",
    status: "metered",
    charges: "owner",
    precheck: true,
    notes: "meterRuntimeActionForOwner before Resend",
  },
  {
    path: "src/app/api/runtime/contact/route.ts",
    feature: "Generated app contact form",
    status: "metered",
    charges: "owner",
    precheck: true,
    notes: "Delegates to createContactRequest with meterEmailToOwner",
  },
  {
    path: "src/lib/projects/app-identity-service.ts",
    feature: "App logo generation (build + regen)",
    status: "metered",
    charges: "owner",
    precheck: true,
    notes: "assertActionCreditsAffordable + charge before generateAppLogo",
  },
  {
    path: "src/app/api/projects/[id]/identity/regenerate-logo/route.ts",
    feature: "Logo regeneration API",
    status: "metered",
    charges: "owner",
    precheck: true,
    notes: "regenerateAppLogo",
  },
  {
    path: "src/app/api/chat/route.ts",
    feature: "Platform builder chat (Discuss/Edit/Build)",
    status: "free_by_design",
    charges: "none",
    precheck: false,
    notes: "Uses Build Credits via chargeAiOperation — not Action Credits",
  },
  {
    path: "(generated runtime)",
    feature: "Generated app AI chatbot",
    status: "not_implemented",
    charges: "owner",
    precheck: false,
    notes: "No dedicated published-app LLM route yet — wire meterRuntimeActionForOwner when added",
  },
  {
    path: "(generated runtime)",
    feature: "Runtime LLM endpoints",
    status: "not_implemented",
    charges: "owner",
    precheck: false,
    notes: "Pending generated-app runtime API",
  },
  {
    path: "(generated runtime)",
    feature: "AI agent endpoints",
    status: "not_implemented",
    charges: "owner",
    precheck: false,
    notes: "Pending generated-app runtime API",
  },
  {
    path: "(generated runtime)",
    feature: "Image generation (runtime)",
    status: "not_implemented",
    charges: "owner",
    precheck: false,
    notes: "Use dreamos-media-router + meterRuntimeActionForOwner",
  },
  {
    path: "(generated runtime)",
    feature: "Draft video generation",
    status: "not_implemented",
    charges: "owner",
    precheck: false,
    notes: "quoteDraftVideoCredits + meterRuntimeActionForOwner",
  },
  {
    path: "(generated runtime)",
    feature: "File upload transformations",
    status: "not_implemented",
    charges: "owner",
    precheck: false,
    notes: "Charge only when provider/infrastructure cost > 0",
  },
  {
    path: "(generated runtime)",
    feature: "Speech / transcription",
    status: "not_implemented",
    charges: "owner",
    precheck: false,
    notes: "Catalog floors defined",
  },
  {
    path: "(generated runtime)",
    feature: "Automation provider runs",
    status: "not_implemented",
    charges: "owner",
    precheck: false,
    notes: "Use automation_run_basic action type",
  },
  {
    path: "(generated runtime)",
    feature: "Data extraction",
    status: "not_implemented",
    charges: "owner",
    precheck: false,
    notes: "Catalog floor 5 AC",
  },
  {
    path: "local",
    feature: "Database CRUD / page navigation",
    status: "free_by_design",
    charges: "none",
    precheck: false,
    notes: "No provider cost",
  },
];

export function meteringCoverageSummary(): {
  metered: number;
  notImplemented: number;
  free: number;
} {
  return {
    metered: RUNTIME_METERING_COVERAGE.filter((r) => r.status === "metered").length,
    notImplemented: RUNTIME_METERING_COVERAGE.filter((r) => r.status === "not_implemented").length,
    free: RUNTIME_METERING_COVERAGE.filter((r) => r.status === "free_by_design").length,
  };
}
