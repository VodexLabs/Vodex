"use client";

import * as React from "react";
import { Loader2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { DiscordGlyph } from "@/components/ui/premium-discord-card";

type DiscordStatus = {
  configured: boolean;
  connected: boolean;
  discordUsername: string | null;
  syncStatus: string | null;
  syncError: string | null;
  syncedAt: string | null;
  expectedTier: string;
  message: string | null;
};

const TIER_LABELS: Record<string, string> = {
  builder: "Builder (Free)",
  starter: "Starter",
  pro: "Pro",
  infinity: "Infinity",
};

function tierLabel(tier: string) {
  return TIER_LABELS[tier] ?? tier;
}

function syncStatusLabel(status: string | null, expectedTier: string) {
  if (!status || status === "not_connected") {
    return "Connect Discord to unlock your community role";
  }
  if (status === "synced") {
    return `Role synced — ${tierLabel(expectedTier)}`;
  }
  if (status === "not_in_guild") {
    return "Join the Vodex Discord server, then sync your role";
  }
  if (status === "not_configured") {
    return "Discord role sync is not configured on this environment";
  }
  if (status === "error") {
    return "Role sync failed — try again";
  }
  return "Role sync pending";
}

export function DiscordAccountCard() {
  const [status, setStatus] = React.useState<DiscordStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/discord/status", { credentials: "include" });
      if (!res.ok) throw new Error("Could not load Discord status");
      setStatus((await res.json()) as DiscordStatus);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load Discord status");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("discord") === "linked") {
      toast.success("Discord connected — syncing your role");
      params.delete("discord");
      const next = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, "");
      window.history.replaceState({}, "", next);
      void load();
    }
    if (params.get("discord") === "error") {
      const reason = params.get("reason") ?? "connect_failed";
      toast.error(`Discord connect failed: ${reason.replace(/_/g, " ")}`);
      params.delete("discord");
      params.delete("reason");
      const next = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, "");
      window.history.replaceState({}, "", next);
    }
  }, [load]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/discord/sync", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string; status?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.message ?? "Sync failed");
      }
      toast.success(json.message ?? "Discord role synced");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
      await load();
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/discord/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Disconnect failed");
      toast.success("Discord disconnected");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  }

  const connected = status?.connected ?? false;
  const configured = status?.configured ?? false;

  return (
    <div
      className="overflow-hidden rounded-2xl border border-[#5865F2]/25 bg-gradient-to-br from-[#5865F2]/[0.08] via-background to-sky-500/[0.05] p-5 ring-1 ring-[#5865F2]/15"
      data-testid="discord-account-card"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#5865F2] text-white shadow-md">
            <DiscordGlyph className="size-6" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">Discord community</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
              Connect Discord to receive your Vodex plan role automatically — Free → Builder, Starter,
              Pro, or Infinity. Staff roles (Founder, Moderator, etc.) are never changed.
            </p>
            {loading ? (
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Loading…
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                {connected && status?.discordUsername ? (
                  <p className="text-[12px] font-medium text-foreground">
                    Connected as <span className="text-[#5865F2]">{status.discordUsername}</span>
                  </p>
                ) : null}
                <p
                  className={cn(
                    "text-[12px]",
                    status?.syncStatus === "error" ? "text-red-600" : "text-muted-foreground",
                  )}
                >
                  {syncStatusLabel(status?.syncStatus ?? null, status?.expectedTier ?? "builder")}
                </p>
                {status?.syncError ? (
                  <p className="text-[11px] text-red-600/90">{status.syncError}</p>
                ) : null}
                {!configured ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    Discord OAuth is not configured in this environment.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:shrink-0">
          {!connected ? (
            <Button
              variant="accent"
              size="sm"
              disabled={!configured || loading}
              asChild
              data-testid="discord-connect-button"
            >
              <a href="/api/integrations/discord/user/oauth/start?returnTo=%2Fsettings%2Fintegrations">
                Connect Discord
              </a>
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                disabled={syncing || !configured}
                onClick={() => void handleSync()}
                data-testid="discord-sync-button"
              >
                {syncing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" strokeWidth={1.65} />
                )}
                Sync role
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={disconnecting}
                onClick={() => void handleDisconnect()}
                data-testid="discord-disconnect-button"
              >
                {disconnecting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Unplug className="size-3.5" strokeWidth={1.65} />
                )}
                Disconnect
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
