"use client";

import * as React from "react";
import { Globe, Loader2, Users, Heart, MessageCircle, Shield } from "lucide-react";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { notifyProjectCatalogUpdated } from "@/lib/projects/project-catalog-sync";
import { cn } from "@/lib/utils";
import { VodexConfirmModal } from "@/components/ui/vodex-confirm-modal";

export function PublishVisibilitySettings({
  projectId,
  initialPublic,
  published,
}: {
  projectId: string;
  initialPublic: boolean;
  published?: boolean;
}) {
  const [isPublic, setIsPublic] = React.useState(initialPublic);
  const [saving, setSaving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    setIsPublic(initialPublic);
  }, [initialPublic, projectId]);

  async function save(next: boolean) {
    setSaving(true);
    setIsPublic(next);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_public: next }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not save visibility");
      toast.success(next ? "App will appear in Explore when published" : "Community listing disabled");
      notifyProjectCatalogUpdated(projectId);
    } catch (err) {
      setIsPublic(!next);
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  function onToggleRequest() {
    if (isPublic) {
      void save(false);
      return;
    }
    setConfirmOpen(true);
  }

  return (
    <>
      <div
        className="overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-background to-surface ring-1 ring-border/80"
        data-testid="publish-visibility-settings"
      >
        <div className="h-[2px] w-full bg-gradient-to-r from-sky-500 via-accent to-violet-500" />
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-accent/15 ring-1 ring-accent/20">
              <Globe className="size-6 text-accent" strokeWidth={1.65} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-foreground">Community visibility</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
                When published, list your app on{" "}
                <Link href="/explore" className="font-semibold text-accent hover:underline">
                  Explore
                </Link>{" "}
                so others can discover it. View-only — visitors cannot edit your app.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-background/70 p-4 ring-1 ring-border/70">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">List in community</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  Others can view your live app and leave comments after you publish.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                disabled={saving}
                onClick={onToggleRequest}
                data-testid="community-visibility-toggle"
                className={cn(
                  "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isPublic ? "bg-accent" : "bg-muted",
                  saving && "opacity-70",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-6 translate-x-1 rounded-full bg-white shadow-md transition-transform",
                    isPublic && "translate-x-7",
                  )}
                />
                {saving ? (
                  <Loader2 className="absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 animate-spin text-white/80" />
                ) : null}
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { icon: Users, label: "View only", desc: "No edits to your project" },
                { icon: MessageCircle, label: "Comments", desc: "Feedback on your build" },
                { icon: Heart, label: "Owner likes", desc: "Your heart shows on comments you love" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-2 rounded-lg bg-surface/80 px-3 py-2 ring-1 ring-border/50"
                >
                  <item.icon className="mt-0.5 size-3.5 shrink-0 text-accent/80" />
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!published ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-500/8 px-3 py-2.5 ring-1 ring-amber-500/20">
              <Shield className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Publish your app first — this setting takes effect on your live URL.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <VodexConfirmModal
        open={confirmOpen}
        title="List your app in the community?"
        description="Other users will be able to view your published app and leave comments. They cannot edit your project or source files. When you like a comment, a heart badge appears next to your profile so everyone knows you appreciated it."
        confirmLabel="Yes, list when published"
        loading={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void save(true)}
      />
    </>
  );
}
