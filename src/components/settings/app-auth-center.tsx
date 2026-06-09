"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { AuthProviderIcon } from "@/components/brand/auth-provider-icons";
import { AuthProviderRow } from "@/components/settings/auth-provider-row";
import { CustomOAuthWizard, type OAuthWizardProvider } from "@/components/settings/custom-oauth-wizard";
import { AuthFallbackPanel } from "@/components/settings/auth-fallback-panel";
import { toast } from "@/lib/toast";
import { AUTH_PROVIDER_CAPABILITIES, connectionModeLabel } from "@/lib/integrations/provider-capabilities";

type AuthSettings = {
  email_password_enabled: boolean;
  google_enabled: boolean;
  github_enabled: boolean;
  apple_enabled: boolean;
  phone_enabled?: boolean;
  oauth_mode: "vodex_managed" | "custom";
  last_auth_error?: string | null;
  customOAuth?: {
    google: { configured: boolean; clientIdPreview: string | null };
    github: { configured: boolean; clientIdPreview: string | null };
    apple: { configured: boolean; gated: boolean; message: string };
  };
};

type Diagnostics = {
  ready: boolean;
  centralOAuthCallbackUrl: string | null;
  publishedAppCallbackUrl: string | null;
  publishedLoginUrl: string | null;
  lastAuthError: string | null;
  googleEnabled: boolean;
  checks?: Array<{ id: string; status: string }>;
};

export function AppAuthCenter({
  projectId,
  planTier,
}: {
  projectId: string;
  planTier: "free" | "starter" | "pro" | "infinity";
}) {
  const [settings, setSettings] = React.useState<AuthSettings | null>(null);
  const [diagnostics, setDiagnostics] = React.useState<Diagnostics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [wizardProvider, setWizardProvider] = React.useState<OAuthWizardProvider | null>(null);

  const canCustomOAuth = planTier !== "free";
  const starterPlus = planTier === "starter" || planTier === "pro" || planTier === "infinity";

  async function load() {
    const [settingsRes, diagRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/auth-settings`, { credentials: "include" }),
      fetch(`/api/projects/${projectId}/auth/diagnostics`, { credentials: "include" }),
    ]);
    if (settingsRes.ok) {
      const body = (await settingsRes.json()) as { settings?: AuthSettings };
      if (body.settings) setSettings(body.settings);
    }
    if (diagRes.ok) {
      const body = (await diagRes.json()) as { diagnostics?: Diagnostics };
      if (body.diagnostics) setDiagnostics(body.diagnostics);
    }
  }

  React.useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [projectId]);

  async function patchSettings(patch: Partial<AuthSettings>) {
    const res = await fetch(`/api/projects/${projectId}/auth-settings`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = (await res.json()) as { error?: string; settings?: AuthSettings };
    if (!res.ok) throw new Error(body.error ?? "Could not update");
    if (body.settings) setSettings((s) => ({ ...s!, ...body.settings }));
    await load();
  }

  async function saveOAuth(provider: "google" | "github", creds: { client_id: string; client_secret: string }) {
    const res = await fetch(`/api/projects/${projectId}/auth-settings`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oauth_mode: "custom",
        google_enabled: provider === "google" ? true : settings?.google_enabled,
        github_enabled: provider === "github" ? true : settings?.github_enabled,
        custom_oauth: { [provider]: creds },
      }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(body.error ?? "Save failed");
    await load();
  }

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-12" data-testid="app-auth-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const oauthFailed = Boolean(diagnostics?.lastAuthError || settings.last_auth_error);
  const redirectUri = diagnostics?.centralOAuthCallbackUrl ?? diagnostics?.publishedAppCallbackUrl;

  const healthFor = (enabled: boolean): "ok" | "warn" | "off" =>
    oauthFailed && enabled ? "warn" : enabled ? "ok" : "off";

  const vodexManagedReady =
    diagnostics?.checks?.some((c) => c.id === "vodex_managed" && c.status === "ok") ?? false;
  const googleCustomConfigured = settings.customOAuth?.google.configured ?? false;
  const googleCanEnable = vodexManagedReady || googleCustomConfigured;
  const githubCustomConfigured = settings.customOAuth?.github.configured ?? false;
  const githubCanEnable = vodexManagedReady || githubCustomConfigured;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4" data-testid="app-auth-center">
      <div>
        <h2 className="text-[18px] font-semibold tracking-tight text-foreground">Authentication</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Enable sign-in methods for your published app. Gmail and email login are recommended first.
        </p>
      </div>

      <div className="rounded-xl bg-accent/5 px-4 py-3 ring-1 ring-accent/15 text-[12px] leading-relaxed text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">Vodex-managed OAuth</span> means users can sign in
          without you creating provider API keys — Vodex runs the OAuth app.
        </p>
        <p className="mt-1.5">
          <span className="font-semibold text-foreground">Custom OAuth</span> means you bring your own client ID,
          secret, and redirect URI from Google, GitHub, or another provider.
        </p>
      </div>

      <AuthFallbackPanel
        oauthFailed={oauthFailed}
        emailEnabled={settings.email_password_enabled}
        loginUrl={diagnostics?.publishedLoginUrl}
        onEnableEmail={() =>
          void patchSettings({ email_password_enabled: true }).then(() => toast.success("Email login enabled"))
        }
      />

      <div className="space-y-2.5">
        <AuthProviderRow
          id="email"
          testId="auth-provider-row-email"
          icon={<AuthProviderIcon provider="email" />}
          title="Gmail / Email & Password"
          description="Email and password login with optional magic link. Enabled by default for most apps."
          enabled={settings.email_password_enabled}
          active={settings.email_password_enabled && healthFor(settings.email_password_enabled) === "ok"}
          health={healthFor(settings.email_password_enabled)}
          statusBadge={settings.email_password_enabled ? "Active" : undefined}
          onToggle={(on) => void patchSettings({ email_password_enabled: on })}
          onConfigure={() => toast.info("Configure SMTP and password rules in your app settings")}
          configureLabel="Email options"
          docsHref="https://vodex.dev/docs/auth/email"
        />

        <AuthProviderRow
          id="google"
          testId="auth-provider-row-google-managed"
          icon={<AuthProviderIcon provider="google" />}
          title="Google"
          description={
            googleCustomConfigured
              ? "Custom Google OAuth is active — managed toggle still available."
              : vodexManagedReady
                ? "Use Vodex-managed Google OAuth — no Google Cloud keys required."
                : "Vodex-managed Google OAuth is not configured by platform admin."
          }
          enabled={settings.google_enabled}
          active={settings.google_enabled && healthFor(settings.google_enabled) === "ok"}
          health={!googleCanEnable ? "off" : healthFor(settings.google_enabled)}
          statusBadge={
            googleCustomConfigured
              ? "Custom OAuth"
              : vodexManagedReady
                ? "Managed by Vodex"
                : "Not configured"
          }
          toggleDisabled={!googleCanEnable}
          onToggle={(on) => {
            if (!googleCanEnable) {
              toast.info(
                vodexManagedReady
                  ? "Configure custom Google OAuth below, or contact support for managed OAuth."
                  : "Vodex-managed Google OAuth is not configured by platform admin.",
              );
              return;
            }
            void patchSettings({ google_enabled: on, oauth_mode: googleCustomConfigured ? "custom" : "vodex_managed" });
          }}
          onConfigure={() => {
            if (vodexManagedReady && !googleCustomConfigured) {
              toast.info("Vodex-managed Google OAuth — just enable the toggle. No API keys needed.");
              return;
            }
            setWizardProvider("google");
          }}
          configureLabel={googleCustomConfigured ? "Manage custom client" : "About managed OAuth"}
          docsHref="https://vodex.dev/docs/auth/google"
        />

        <AuthProviderRow
          id="google-custom"
          nested
          icon={<AuthProviderIcon provider="google-custom" className="opacity-80" />}
          title="Custom Google OAuth"
          description="Use your own Google Cloud OAuth client ID and secret."
          enabled={settings.customOAuth?.google.configured ?? false}
          health={settings.customOAuth?.google.configured ? "ok" : "off"}
          locked={!starterPlus}
          lockBadge={starterPlus ? undefined : "Starter+"}
          showToggle={false}
          onConfigure={() => (starterPlus ? setWizardProvider("google") : toast.info("Upgrade to Starter+ for custom OAuth"))}
          configureLabel="Configure client"
        />

        {(
          [
            { id: "github" as const, label: "GitHub", key: "github_enabled" as const, customKey: "github" as const },
            { id: "apple" as const, label: "Apple", key: "apple_enabled" as const },
            { id: "microsoft" as const, label: "Microsoft" },
            { id: "discord" as const, label: "Discord" },
            { id: "facebook" as const, label: "Facebook" },
          ] as const
        ).map((p) => {
          const cap = AUTH_PROVIDER_CAPABILITIES[p.id];
          const comingSoon = cap?.connectionMode === "coming_soon";
          const managed = cap?.managedByVodex === true;
          const enabled = "key" in p && p.key ? Boolean(settings[p.key]) : false;
          const configured =
            "customKey" in p && p.customKey
              ? settings.customOAuth?.[p.customKey]?.configured
              : undefined;
          const canEnableGithub = p.id === "github" ? githubCanEnable : !comingSoon;
          const statusBadge = comingSoon
            ? "Coming soon"
            : p.id === "github" && githubCustomConfigured
              ? "Custom OAuth"
              : p.id === "github" && vodexManagedReady
                ? "Managed by Vodex"
                : managed
                  ? "Managed by Vodex"
                  : configured
                    ? "Configured"
                    : cap
                      ? connectionModeLabel(cap.connectionMode)
                      : undefined;
          return (
            <AuthProviderRow
              key={p.id}
              id={p.id}
              icon={<AuthProviderIcon provider={p.id} />}
              title={p.label}
              description={
                comingSoon
                  ? `${p.label} sign-in is coming soon. Use email/Google or Custom OAuth in the meantime.`
                  : managed
                    ? `Vodex-managed ${p.label} sign-in — enable when ready for your published app.`
                    : `Let users sign in with ${p.label}.`
              }
              enabled={enabled}
              active={enabled && !comingSoon && healthFor(enabled) === "ok"}
              health={comingSoon ? "off" : healthFor(enabled)}
              statusBadge={enabled && !comingSoon ? "Active" : statusBadge}
              onToggle={
                comingSoon || !("key" in p && p.key)
                  ? undefined
                  : (on) => void patchSettings({ [p.key]: on } as Partial<AuthSettings>)
              }
              showToggle={!comingSoon && "key" in p && Boolean(p.key)}
              toggleDisabled={comingSoon || (p.id === "github" && !canEnableGithub)}
              onConfigure={() => {
                if (comingSoon) {
                  toast.info(`${p.label} OAuth setup is coming soon — use Custom OAuth for now.`);
                  return;
                }
                if (p.id === "github") setWizardProvider("github");
                else if (p.id === "apple") setWizardProvider("apple");
                else toast.info(`${p.label} configuration`);
              }}
              docsHref={cap?.docsUrl ?? `https://vodex.dev/docs/auth/${p.id}`}
            />
          );
        })}

        <AuthProviderRow
          id="custom-oauth"
          icon={<AuthProviderIcon provider="custom" />}
          title="Custom OAuth"
          description="Bring your own OAuth provider with client ID, secret, and redirect URI."
          enabled={settings.oauth_mode === "custom"}
          health={settings.oauth_mode === "custom" ? "ok" : "off"}
          locked={!canCustomOAuth}
          lockBadge={canCustomOAuth ? undefined : "Starter+"}
          showToggle={false}
          onConfigure={() =>
            canCustomOAuth ? setWizardProvider("custom") : toast.info("Upgrade to Starter+ for custom OAuth")
          }
          configureLabel="Open setup wizard"
          docsHref="https://vodex.dev/docs/auth/custom-oauth"
        />
      </div>

      {wizardProvider ? (
        <CustomOAuthWizard
          open
          provider={wizardProvider}
          onClose={() => setWizardProvider(null)}
          redirectUri={redirectUri ?? null}
          callbackUrl={diagnostics?.publishedAppCallbackUrl ?? diagnostics?.centralOAuthCallbackUrl ?? null}
          publishedOrigins={(() => {
            try {
              return diagnostics?.publishedLoginUrl
                ? [new URL(diagnostics.publishedLoginUrl).origin]
                : [];
            } catch {
              return [];
            }
          })()}
          configured={
            wizardProvider === "google"
              ? settings.customOAuth?.google.configured
              : wizardProvider === "github"
                ? settings.customOAuth?.github.configured
                : false
          }
          initialClientId={
            wizardProvider === "google"
              ? (settings.customOAuth?.google.clientIdPreview ?? "")
              : wizardProvider === "github"
                ? (settings.customOAuth?.github.clientIdPreview ?? "")
                : ""
          }
          onSave={async (creds) => {
            if (wizardProvider === "google" || wizardProvider === "github") {
              await saveOAuth(wizardProvider, creds);
            } else {
              await patchSettings({ oauth_mode: "custom" });
            }
            setWizardProvider(null);
          }}
          onHealthCheck={async () => {
            const r = await fetch(`/api/projects/${projectId}/auth/test-config`, {
              method: "POST",
              credentials: "include",
            });
            const body = (await r.json()) as { ready?: boolean; message?: string };
            return { ok: Boolean(body.ready), message: body.message };
          }}
        />
      ) : null}
    </div>
  );
}
