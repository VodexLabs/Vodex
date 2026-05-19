/** Names we recognize when the model or user mentions third-party integrations. */
const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "OPENAI_API_KEY", re: /\bOPENAI_API_KEY\b|sk-[a-zA-Z0-9]{10,}/i },
  { name: "ANTHROPIC_API_KEY", re: /\bANTHROPIC_API_KEY\b|sk-ant-[a-zA-Z0-9_-]{10,}/i },
  { name: "GOOGLE_GENERATIVE_AI_API_KEY", re: /\bGOOGLE_GENERATIVE_AI_API_KEY\b/i },
  { name: "SUPABASE_URL", re: /\bSUPABASE_URL\b/i },
  { name: "SUPABASE_ANON_KEY", re: /\bSUPABASE_ANON_KEY\b/i },
  { name: "SUPABASE_SERVICE_ROLE_KEY", re: /\bSUPABASE_SERVICE_ROLE_KEY\b/i },
  { name: "STRIPE_SECRET_KEY", re: /\bSTRIPE_SECRET_KEY\b|sk_live_|sk_test_/i },
  { name: "STRIPE_PUBLISHABLE_KEY", re: /\bpk_live_|pk_test_|STRIPE_PUBLISHABLE_KEY\b/i },
  { name: "RESEND_API_KEY", re: /\bRESEND_API_KEY\b/i },
  { name: "CLOUDFLARE_R2_ACCESS_KEY_ID", re: /\bR2_|CLOUDFLARE_R2/i },
  { name: "SLACK_BOT_TOKEN", re: /\bxox[baprs]-|SLACK_BOT_TOKEN\b/i },
  { name: "GITHUB_TOKEN", re: /\bGITHUB_TOKEN\b|gh[pous]_[A-Za-z0-9]+/i },
  { name: "FIREBASE_SERVICE_ACCOUNT_JSON", re: /\bFIREBASE_|firebase_admin|GOOGLE_APPLICATION_CREDENTIALS\b/i },
  { name: "GOOGLE_OAUTH_CLIENT_ID", re: /\bGOOGLE_OAUTH_CLIENT_ID\b/i },
  { name: "GOOGLE_OAUTH_CLIENT_SECRET", re: /\bGOOGLE_OAUTH_CLIENT_SECRET\b/i },
];

/** Optional explicit markers from assistant: `REQUIRED_SECRET: NAME` */
const EXPLICIT_RE = /REQUIRED_SECRET\s*[:]\s*([A-Z0-9_]+)/gi;

export function detectRequiredSecretNames(text: string): string[] {
  const found = new Set<string>();
  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) found.add(name);
  }
  let m: RegExpExecArray | null;
  EXPLICIT_RE.lastIndex = 0;
  while ((m = EXPLICIT_RE.exec(text)) !== null) {
    const n = m[1]?.trim();
    if (n) found.add(n);
  }
  return [...found];
}
