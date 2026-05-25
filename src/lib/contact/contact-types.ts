export const CONTACT_SOURCES = [
  "platform_contact",
  "generated_app_contact",
  "support",
  "sales",
  "bug_report",
  "billing",
  "abuse",
  "contact_page",
  "pricing_modal",
] as const;

export type ContactSource = (typeof CONTACT_SOURCES)[number];

export const CONTACT_STATUSES = [
  "new",
  "open",
  "read",
  "replied",
  "resolved",
  "archived",
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type ContactPriority = (typeof CONTACT_PRIORITIES)[number];

export const CONTACT_EMAIL_STATUSES = [
  "pending",
  "sent",
  "failed",
  "skipped_no_config",
] as const;

export type ContactEmailStatus = (typeof CONTACT_EMAIL_STATUSES)[number];

export type ContactRequestRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  owner_user_id: string | null;
  project_id: string | null;
  app_slug: string | null;
  source: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  reason: string | null;
  kind: string | null;
  company: string | null;
  plan_interest: string | null;
  status: string;
  priority: string;
  email_status: string;
  assigned_to: string | null;
  metadata: Record<string, unknown>;
};

export function normalizeContactStatus(status: string): ContactStatus {
  if (status === "read") return "open";
  if ((CONTACT_STATUSES as readonly string[]).includes(status)) return status as ContactStatus;
  return "new";
}

export function displayContactStatus(status: string): string {
  const n = normalizeContactStatus(status);
  if (n === "open") return "Open";
  return n.charAt(0).toUpperCase() + n.slice(1);
}
