import type { AppArchetypeId } from "@/lib/build/app-archetype-classifier";

/** Internal reference patterns — guide the model, do not copy verbatim. */
export type ArchetypeUiPattern = {
  id: AppArchetypeId;
  referenceLayout: string;
  mustHaveComponents: string[];
  sampleDataExamples: string[];
  interactions: string[];
};

export const ARCHETYPE_UI_PATTERNS: ArchetypeUiPattern[] = [
  {
    id: "restaurant_inventory",
    referenceLayout:
      "Sidebar: Dashboard, Inventory, Suppliers, Orders, Waste, Alerts. Dashboard: stock value KPIs, low-stock table, expiring-soon list, supplier order panel, waste % chart.",
    mustHaveComponents: ["metric row", "inventory table with qty/category/supplier/expiry", "alert panel", "reorder CTA", "category filter"],
    sampleDataExamples: ["Atlantic Salmon — 12 kg — expires in 2d", "Olive oil — par 24 — supplier: FreshCo"],
    interactions: ["filter by category", "mark reorder", "acknowledge alert"],
  },
  {
    id: "crm",
    referenceLayout:
      "Sidebar: Dashboard, Patients/Contacts, Appointments, Treatments, Billing, Follow-ups. Dashboard: today's appointments, overdue follow-ups, active patients, revenue snapshot.",
    mustHaveComponents: ["schedule timeline", "patient table", "status badges", "add patient modal"],
    sampleDataExamples: ["Dr. Lee — Cleaning — 2:30 PM", "Mia Chen — Follow-up overdue"],
    interactions: ["search patients", "book appointment", "log treatment note"],
  },
  {
    id: "event_ticketing",
    referenceLayout:
      "TicketHub shell: Browse events, event detail, checkout, My Tickets with QR, Organizer dashboard, Check-in list, Orders overview.",
    mustHaveComponents: [
      "event card grid",
      "checkout summary",
      "QR ticket component",
      "organizer KPI row",
      "check-in table",
      "search/filter",
    ],
    sampleDataExamples: ["Summer Fest — $45 GA — 120 sold", "VIP Table — QR #A-2041 — checked in"],
    interactions: ["filter events", "purchase ticket", "scan check-in", "view sales"],
  },
  {
    id: "marina_operations",
    referenceLayout:
      "MarinaOps shell: occupancy KPIs, slip assignment table, maintenance queue, owner notifications, optional weather/tide card.",
    mustHaveComponents: ["occupancy %", "slip grid/table", "work order queue", "owner message panel", "search/filter"],
    sampleDataExamples: ["Slip B-12 — occupied — Owner: Rivera", "Work order: dock light repair — urgent"],
    interactions: ["assign slip", "create work order", "notify owner"],
  },
  {
    id: "ecommerce",
    referenceLayout: "Storefront grid, product detail, cart drawer/page, checkout summary with totals.",
    mustHaveComponents: ["product cards with image/price", "add to cart", "cart line items", "empty cart state"],
    sampleDataExamples: ["Ceramic mug — $24", "Linen throw — $68"],
    interactions: ["filter collection", "update quantity", "checkout"],
  },
  {
    id: "finance_tracker",
    referenceLayout: "Balance cards, spend trend chart, categorized transactions, insights card.",
    mustHaveComponents: ["balance KPIs", "transaction table", "date filter", "category chips"],
    sampleDataExamples: ["Groceries — $142 — Mar 12", "Payroll — $3,200 — Mar 1"],
    interactions: ["filter month", "categorize transaction"],
  },
  {
    id: "booking",
    referenceLayout: "Service picker → calendar slots → summary → confirmation.",
    mustHaveComponents: ["service cards", "time slot grid", "booking summary", "confirmation banner"],
    sampleDataExamples: ["Haircut — 45 min — $55", "Thu 3:00 PM available"],
    interactions: ["pick service", "select slot", "confirm booking"],
  },
  {
    id: "mental_wellness_journal",
    referenceLayout:
      "Calm home hero, today's mood check-in card, guided prompt, mood trend chart, insight cards, encrypted messaging trust panel, CTAs to journal/check-ins/insights.",
    mustHaveComponents: [
      "mood check-in card",
      "guided prompt card",
      "trend chart",
      "journal entry list",
      "private message panel",
      "insight cards",
    ],
    sampleDataExamples: [
      "Mood 7/10 — steady morning",
      "Prompt: What felt supportive today?",
      "Encrypted thread with therapist",
    ],
    interactions: ["log mood", "start reflection", "open secure inbox", "view trends"],
  },
  {
    id: "ai_tool",
    referenceLayout: "Prompt composer left, streaming output center, history sidebar, usage meter top-right.",
    mustHaveComponents: ["textarea prompt", "generate button", "output panel", "history list", "copy/regenerate"],
    sampleDataExamples: ["Draft product launch email", "Session from yesterday"],
    interactions: ["submit prompt", "copy output", "open history item"],
  },
  {
    id: "marketplace",
    referenceLayout: "Browse grid, listing detail, seller profile snippet, inquiry CTA.",
    mustHaveComponents: ["listing cards", "price/filter bar", "seller badge", "message seller"],
    sampleDataExamples: ["Vintage desk — $240 — Portland", "Seller: Studio Oak — 4.9★"],
    interactions: ["filter price", "save listing", "contact seller"],
  },
];

export function patternForArchetype(archetypeId: AppArchetypeId): ArchetypeUiPattern | null {
  return ARCHETYPE_UI_PATTERNS.find((p) => p.id === archetypeId) ?? null;
}

export function archetypePatternPromptBlock(archetypeId: AppArchetypeId): string {
  const p = patternForArchetype(archetypeId);
  if (!p) {
    return [
      "REFERENCE PATTERN: Premium SaaS dashboard with sidebar, 4+ KPI cards, primary data table, filters, and polished empty/loading states.",
      "Use realistic domain-specific labels from the user's app purpose.",
    ].join("\n");
  }
  return [
    `REFERENCE PATTERN (${p.id}) — inspire layout, do not copy text literally:`,
    p.referenceLayout,
    `Must-have components: ${p.mustHaveComponents.join("; ")}`,
    `Sample data examples: ${p.sampleDataExamples.join(" | ")}`,
    `Interactions: ${p.interactions.join("; ")}`,
  ].join("\n");
}
