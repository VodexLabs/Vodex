/**
 * Live runtime objects DreamOS86 requires after full compatibility SQL.
 * Used by schema-health and admin debug endpoints.
 */

export const RUNTIME_REQUIRED_TABLES = [
  "profiles",
  "projects",
  "conversations",
  "messages",
  "message_attachments",
  "app_files",
  "build_jobs",
  "publish_jobs",
  "wrap_jobs",
  "preview_errors",
  "publish_records",
  "ai_usage_logs",
  "credit_events",
  "token_ledger",
  "admin_actions",
  "admin_audit_logs",
  "subscriptions",
  "contact_requests",
  "referral_codes",
  "referrals",
  "referral_rewards",
  "project_integrations",
  "project_secrets",
  "project_connection_audit",
  "dreamos_diagnostic_logs",
] as const;

export const RUNTIME_CRITICAL_TABLES = [
  "profiles",
  "projects",
  "conversations",
  "messages",
  "app_files",
  "build_jobs",
  "ai_usage_logs",
  "credit_events",
  "token_ledger",
] as const;

export const RUNTIME_REQUIRED_RPCS = [
  "ensure_user_profile",
  "charge_tokens",
  "charge_credits",
  "grant_tokens",
  "grant_credits",
  "grant_credits_admin",
  "complete_user_onboarding",
  "claim_referral_reward",
] as const;

export const RUNTIME_CRITICAL_RPCS = ["ensure_user_profile", "charge_tokens"] as const;

export const PROJECT_IDENTITY_COLUMNS = [
  "app_name",
  "icon_svg",
  "icon_url",
  "description",
  "category",
  "build_status",
  "last_build_id",
  "last_build_at",
] as const;
