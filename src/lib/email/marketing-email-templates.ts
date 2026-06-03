export type MarketingEmailTemplateId =
  | "welcome"
  | "first_app_guide"
  | "credits_low"
  | "new_feature"
  | "upgrade_offer";

export type MarketingEmailTemplate = {
  id: MarketingEmailTemplateId;
  label: string;
  subject: string;
  preheader: string;
  buildHtml: (ctx: { appUrl: string; unsubscribeUrl: string; name?: string }) => string;
};

function layout(body: string, ctx: { appUrl: string; unsubscribeUrl: string }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Vodex</title></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#e0f2fe 0%,#f8fafc 42%);padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 16px 48px rgba(14,116,244,0.14);">
<tr><td style="padding:32px 36px 12px;background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 55%,#8b5cf6 100%);">
<span style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.03em;">Vodex</span>
<p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">Build apps with AI — ship real previews</p>
</td></tr>
<tr><td style="padding:28px 36px 36px;font-size:15px;line-height:1.65;">${body}</td></tr>
<tr><td style="padding:0 36px 32px;font-size:12px;color:#64748b;line-height:1.55;border-top:1px solid #e2e8f0;">
<p style="margin:0 0 8px;">© ${new Date().getFullYear()} Vodex · <a href="${ctx.appUrl}" style="color:#2563eb;text-decoration:none;">Open Vodex</a></p>
<p style="margin:0;">Product email — <a href="${ctx.unsubscribeUrl}" style="color:#2563eb;">Manage preferences</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function cta(href: string, label: string, secondary?: { href: string; label: string }) {
  const primary = `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:12px;margin:8px 8px 8px 0;">${label}</a>`;
  const sec = secondary
    ? `<a href="${secondary.href}" style="display:inline-block;color:#2563eb;text-decoration:none;font-weight:600;padding:14px 18px;">${secondary.label} →</a>`
    : "";
  return `<p style="margin:28px 0 8px;">${primary}${sec}</p>`;
}

export const MARKETING_EMAIL_TEMPLATES: MarketingEmailTemplate[] = [
  {
    id: "welcome",
    label: "Welcome to Vodex",
    subject: "Welcome to Vodex — your workspace is ready",
    preheader: "Create your first app in minutes with AI.",
    buildHtml: (ctx) =>
      layout(
        `<p style="margin-top:0;">Hi${ctx.name ? ` <strong>${ctx.name}</strong>` : ""},</p>
<p>Welcome to <strong>Vodex</strong> — the icy-clean workspace where you describe apps in plain language and ship real previews fast.</p>
<h3 style="margin:24px 0 12px;font-size:16px;">Three steps to your first app</h3>
<ol style="margin:0;padding-left:22px;color:#334155;">
<li style="margin-bottom:10px;"><strong>Open the builder</strong> and describe what you want to build.</li>
<li style="margin-bottom:10px;"><strong>Review the live preview</strong> and iterate in chat.</li>
<li style="margin-bottom:10px;"><strong>Publish or connect integrations</strong> when you're ready to go live.</li>
</ol>
${cta(`${ctx.appUrl}/create`, "Create your first app", { href: `${ctx.appUrl}/templates`, label: "Explore templates" })}
<p style="font-size:14px;color:#64748b;">Questions? Reply to this email — we're here to help.</p>`,
        ctx,
      ),
  },
  {
    id: "first_app_guide",
    label: "First App Guide",
    subject: "Your first Vodex app — prompt tips inside",
    preheader: "Example prompts that ship polished UIs.",
    buildHtml: (ctx) =>
      layout(
        `<p>Ready to ship something real on Vodex?</p>
<h3 style="font-size:16px;">Prompt tips</h3>
<ul style="padding-left:20px;color:#334155;">
<li>Describe the <strong>user</strong> and the <strong>job to be done</strong>.</li>
<li>Mention layout: dashboard, landing page, mobile-first, etc.</li>
<li>Ask for polish: "premium icy UI, soft shadows, accessible contrast."</li>
</ul>
<div style="margin:20px 0;padding:16px 18px;background:#f0f9ff;border-radius:12px;border:1px solid #bae6fd;">
<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0369a1;">Example prompts</p>
<p style="margin:0 0 6px;font-size:13px;color:#334155;">"Build a SaaS analytics dashboard with sidebar nav, KPI cards, and a revenue chart."</p>
<p style="margin:0;font-size:13px;color:#334155;">"Create a restaurant booking app with menu, reservations, and admin panel."</p>
</div>
${cta(`${ctx.appUrl}/create`, "Start building")}`,
        ctx,
      ),
  },
  {
    id: "credits_low",
    label: "Credits running low",
    subject: "Your Vodex credits need attention",
    preheader: "Build or Action credits at 80% or exhausted — upgrade for uninterrupted building.",
    buildHtml: (ctx) =>
      layout(
        `<p>Your <strong>Build Credits</strong> or <strong>Action Credits</strong> are running low for this billing period.</p>
<div style="display:block;margin:20px 0;padding:18px;background:linear-gradient(135deg,#fff7ed,#fef3c7);border-radius:12px;border:1px solid #fcd34d;">
<p style="margin:0 0 6px;font-weight:700;color:#92400e;">80% used</p>
<p style="margin:0;font-size:14px;color:#78350f;">We'll notify you once per cycle so you're never surprised mid-build.</p>
</div>
<div style="display:block;margin:20px 0;padding:18px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border-radius:12px;border:1px solid #fca5a5;">
<p style="margin:0 0 6px;font-weight:700;color:#991b1b;">100% exhausted</p>
<p style="margin:0;font-size:14px;color:#7f1d1d;">Upgrade for more capacity, or wait for your plan reset — projects stay saved.</p>
</div>
${cta(`${ctx.appUrl}/pricing`, "Upgrade plan", { href: `${ctx.appUrl}/settings/billing`, label: "Manage billing" })}`,
        ctx,
      ),
  },
  {
    id: "new_feature",
    label: "New feature announcement",
    subject: "New on Vodex — product update",
    preheader: "Faster generation, richer dashboards, smoother publishing.",
    buildHtml: (ctx) =>
      layout(
        `<p>We've shipped meaningful improvements across Vodex:</p>
<ul style="padding-left:20px;color:#334155;">
<li><strong>Faster generation</strong> with smarter routing</li>
<li><strong>Richer app dashboards</strong> for secrets, integrations, and publish</li>
<li><strong>Smoother publishing</strong> and preview reliability</li>
</ul>
${cta(`${ctx.appUrl}/dashboard`, "Open dashboard", { href: `${ctx.appUrl}/changelog`, label: "Read changelog" })}`,
        ctx,
      ),
  },
  {
    id: "upgrade_offer",
    label: "Upgrade / special offer",
    subject: "Unlock more on Vodex",
    preheader: "More credits, Pro integrations, and team collaboration.",
    buildHtml: (ctx) =>
      layout(
        `<p>Upgrade to get the most from Vodex:</p>
<div style="margin:20px 0;padding:20px;border-radius:14px;background:linear-gradient(135deg,#eff6ff,#eef2ff);border:1px solid #c7d2fe;">
<ul style="margin:0;padding-left:20px;color:#1e293b;">
<li>More <strong>Build & Action credits</strong></li>
<li><strong>Pro integrations</strong> (GitHub, Supabase, and more)</li>
<li><strong>Team collaboration</strong> on shared workspaces</li>
</ul>
</div>
${cta(`${ctx.appUrl}/pricing`, "See pricing & upgrade")}`,
        ctx,
      ),
  },
];

/** @deprecated use first_app_guide */
export const getting_started = MARKETING_EMAIL_TEMPLATES.find((t) => t.id === "first_app_guide");
