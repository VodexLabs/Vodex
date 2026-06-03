import { CANONICAL_ROUTES, getAppBaseUrl } from "@/lib/config/canonical-urls";

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

function layout(body: string, ctx: { appUrl: string; unsubscribeUrl: string }, hero?: string) {
  const heroBlock = hero
    ? `<tr><td style="padding:0;"><div style="padding:36px 36px 28px;background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 52%,#8b5cf6 100%);">${hero}</div></td></tr>`
    : `<tr><td style="padding:32px 36px 12px;background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 55%,#8b5cf6 100%);">
<span style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.03em;">Vodex</span>
<p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.92);">Build apps with AI — ship real previews</p>
</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Vodex</title></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#e0f2fe 0%,#f8fafc 42%);padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 16px 48px rgba(14,116,244,0.14);">
${heroBlock}
<tr><td style="padding:28px 36px 36px;font-size:15px;line-height:1.65;">${body}</td></tr>
<tr><td style="padding:0 36px 32px;font-size:12px;color:#64748b;line-height:1.55;border-top:1px solid #e2e8f0;">
<p style="margin:0 0 8px;">© ${new Date().getFullYear()} Vodex · <a href="${ctx.appUrl}" style="color:#2563eb;text-decoration:none;">Open Vodex</a></p>
<p style="margin:0 0 6px;"><a href="${CANONICAL_ROUTES.discord}" style="color:#2563eb;text-decoration:none;">Join our Discord</a> · <a href="${CANONICAL_ROUTES.publicStatus}" style="color:#2563eb;text-decoration:none;">Status</a></p>
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

function section(title: string, html: string) {
  return `<div style="margin:24px 0 0;padding:20px 22px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
<h3 style="margin:0 0 10px;font-size:15px;color:#0f172a;">${title}</h3>
${html}
</div>`;
}

export function buildMarketingEmailContext(unsubscribeUrl: string, name?: string) {
  return { appUrl: getAppBaseUrl(), unsubscribeUrl, name };
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
${section(
          "Three steps to your first app",
          `<ol style="margin:0;padding-left:22px;color:#334155;">
<li style="margin-bottom:10px;"><strong>Open the builder</strong> and describe what you want to build.</li>
<li style="margin-bottom:10px;"><strong>Review the live preview</strong> and iterate in chat.</li>
<li style="margin-bottom:10px;"><strong>Publish or connect integrations</strong> when you're ready to go live.</li>
</ol>`,
        )}
${section(
          "Community & support",
          `<p style="margin:0;color:#475569;">Meet builders on <a href="${CANONICAL_ROUTES.discord}" style="color:#2563eb;">Discord</a>, browse <a href="${ctx.appUrl}${CANONICAL_ROUTES.templates}" style="color:#2563eb;">templates</a>, and check <a href="${CANONICAL_ROUTES.statusPage}" style="color:#2563eb;">status</a> anytime.</p>`,
        )}
${cta(`${ctx.appUrl}${CANONICAL_ROUTES.create}`, "Create your first app", {
          href: `${ctx.appUrl}${CANONICAL_ROUTES.templates}`,
          label: "Explore templates",
        })}
<p style="font-size:14px;color:#64748b;">Questions? Reply to this email — we're here to help.</p>`,
        ctx,
        `<span style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.03em;">Welcome to Vodex</span>
<p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.92);max-width:420px;">Your workspace is ready — free credits are waiting so you can start building today.</p>`,
      ),
  },
  {
    id: "first_app_guide",
    label: "First App Guide",
    subject: "Your first Vodex app — prompt tips inside",
    preheader: "Example prompts that ship polished UIs.",
    buildHtml: (ctx) =>
      layout(
        `<p style="margin-top:0;">Ready to ship something real on Vodex?</p>
${section(
          "Prompt tips",
          `<ul style="margin:0;padding-left:20px;color:#334155;">
<li>Describe the <strong>user</strong> and the <strong>job to be done</strong>.</li>
<li>Mention layout: dashboard, landing page, mobile-first, etc.</li>
<li>Ask for polish: "premium icy UI, soft shadows, accessible contrast."</li>
</ul>`,
        )}
${section(
          "Example prompts",
          `<p style="margin:0 0 8px;font-size:13px;color:#334155;">"Build a SaaS analytics dashboard with sidebar nav, KPI cards, and a revenue chart."</p>
<p style="margin:0;font-size:13px;color:#334155;">"Create a restaurant booking app with menu, reservations, and admin panel."</p>`,
        )}
${cta(`${ctx.appUrl}${CANONICAL_ROUTES.create}`, "Start building")}`,
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
        `<p style="margin-top:0;">Your <strong>Build Credits</strong> and <strong>Action Credits</strong> power generation, icons, and workspace automation. Here's what to know:</p>
${section(
          "80% used this cycle",
          `<p style="margin:0;color:#78350f;">We'll notify you once per cycle so you're never surprised mid-build. You can keep working — consider upgrading before you hit the cap.</p>`,
        )}
${section(
          "100% exhausted",
          `<p style="margin:0;color:#7f1d1d;">Upgrade for more capacity, or wait for your plan reset — your projects and files stay saved.</p>`,
        )}
${cta(`${ctx.appUrl}${CANONICAL_ROUTES.billing}`, "Upgrade plan", {
          href: `${ctx.appUrl}${CANONICAL_ROUTES.settingsBilling}`,
          label: "Add credits",
        })}
<p style="font-size:13px;color:#64748b;">Manage billing anytime from Settings → Billing.</p>`,
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
        `<p style="margin-top:0;">We've shipped meaningful improvements across Vodex:</p>
${section(
          "What's new",
          `<ul style="margin:0;padding-left:20px;color:#334155;">
<li><strong>Faster generation</strong> with smarter routing</li>
<li><strong>Richer app dashboards</strong> for secrets, integrations, and publish</li>
<li><strong>Smoother publishing</strong> and preview reliability</li>
<li><strong>Control Center</strong> tools for admins (in-app inbox & status)</li>
</ul>`,
        )}
${cta(`${ctx.appUrl}${CANONICAL_ROUTES.home}`, "Open Vodex", {
          href: `${ctx.appUrl}/changelog`,
          label: "Read changelog",
        })}`,
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
        `<p style="margin-top:0;">Upgrade to get the most from Vodex:</p>
${section(
          "Pro benefits",
          `<ul style="margin:0;padding-left:20px;color:#1e293b;">
<li>More <strong>Build & Action credits</strong></li>
<li><strong>Pro integrations</strong> (GitHub, Supabase, and more)</li>
<li><strong>Team collaboration</strong> on shared workspaces</li>
<li>Priority support on <a href="${CANONICAL_ROUTES.discord}" style="color:#2563eb;">Discord</a></li>
</ul>`,
        )}
${cta(`${ctx.appUrl}${CANONICAL_ROUTES.billing}`, "See pricing & upgrade")}`,
        ctx,
      ),
  },
];

/** @deprecated use first_app_guide */
export const getting_started = MARKETING_EMAIL_TEMPLATES.find((t) => t.id === "first_app_guide");
