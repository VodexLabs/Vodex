"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { storeAutostartHandoff, type PendingPrompt } from "@/lib/create/autostart-handoff";

const ImmersiveWorkspace = dynamic(
  () => import("@/components/create/workspace/immersive-workspace").then((m) => m.ImmersiveWorkspace),
  {
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground/40" strokeWidth={1.75} />
      </div>
    ),
  },
);

type CreateWorkspaceEntryProps = {
  initialPrompt?: string;
  initialProjectId?: string | null;
  initialMode?: string;
  initialAutoStart?: boolean;
  initialStrategy?: string;
  initialModel?: string;
  initialSkipDraft?: boolean;
};

function builderUrl(
  projectId: string,
  prompt: string,
  mode: string,
  autoStart: boolean,
  strategy?: string,
  model?: string,
): string {
  const params = new URLSearchParams();
  if (prompt.trim()) params.set("prompt", prompt.trim());
  if (mode && mode !== "build") params.set("mode", mode);
  if (autoStart) params.set("autostart", "1");
  if (strategy) params.set("strategy", strategy);
  if (model) params.set("model", model);
  const qs = params.toString();
  return `/apps/${projectId}/builder${qs ? `?${qs}` : ""}`;
}

export function CreateWorkspaceEntry({
  initialPrompt = "",
  initialProjectId = null,
  initialMode = "build",
  initialAutoStart = false,
  initialStrategy = "plan_first",
  initialModel = "",
  initialSkipDraft = false,
}: CreateWorkspaceEntryProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [discussOnly, setDiscussOnly] = React.useState(initialSkipDraft);

  React.useEffect(() => {
    if (discussOnly) return;
    let cancelled = false;

    async function bootstrap() {
      const prompt = initialPrompt.trim();
      const mode = (initialMode === "discuss" || initialMode === "edit" || initialMode === "build"
        ? initialMode
        : "build") as PendingPrompt["mode"];
      const autoStart = initialAutoStart || Boolean(prompt);

      const strategy =
        initialStrategy === "build_now" || initialStrategy === "plan_first"
          ? initialStrategy
          : "plan_first";

      if (autoStart && prompt) {
        const id = storeAutostartHandoff(prompt, mode, {
          buildStrategy: strategy,
          modelId: initialModel || undefined,
        });

        if (initialProjectId) {
          router.replace(builderUrl(initialProjectId, prompt, mode, autoStart, strategy, initialModel));
          return;
        }

        if (initialSkipDraft) {
          setDiscussOnly(true);
          return;
        }

        const res = await fetch("/api/create/project-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: "Untitled App",
            idempotencyKey: id,
            sessionId: id,
          }),
        });
        const body = (await res.json()) as { projectId?: string; error?: string; hint?: string; reused?: boolean };
        if (cancelled) return;
        if (!res.ok || !body.projectId) {
          setError(body.error ?? body.hint ?? "Could not open create workspace");
          return;
        }
        router.replace(builderUrl(body.projectId, prompt, mode, autoStart, strategy, initialModel));
        return;
      }

      if (initialProjectId) {
        router.replace(builderUrl(initialProjectId, prompt, mode, autoStart, strategy, initialModel));
        return;
      }

      if (prompt) {
        try {
          const intentRes = await fetch("/api/projects/classify-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ prompt }),
          });
          const intent = (await intentRes.json()) as {
            intent?: string;
            shouldCreateProject?: boolean;
            shouldAnswerQuestion?: boolean;
          };
          if (
            !cancelled &&
            (intent.intent === "question_only" ||
              intent.shouldAnswerQuestion ||
              intent.shouldCreateProject === false)
          ) {
            setDiscussOnly(true);
            return;
          }
        } catch {
          /* proceed with draft if classifier unavailable */
        }
      }

      const res = await fetch("/api/create/project-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: "Untitled App" }),
      });
      const body = (await res.json()) as { projectId?: string; error?: string; hint?: string };
      if (cancelled) return;
      if (!res.ok || !body.projectId) {
        setError(body.error ?? body.hint ?? "Could not open create workspace");
        return;
      }
      router.replace(builderUrl(body.projectId, prompt, mode, autoStart, strategy, initialModel));
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [
    discussOnly,
    initialAutoStart,
    initialMode,
    initialModel,
    initialProjectId,
    initialPrompt,
    initialSkipDraft,
    initialStrategy,
    router,
  ]);

  if (discussOnly) {
    const mode =
      initialMode === "discuss" || initialMode === "edit" || initialMode === "build"
        ? initialMode
        : "discuss";
    return (
      <ImmersiveWorkspace
        initialPrompt={initialPrompt}
        initialMode={mode === "build" ? "discuss" : mode}
        initialAutoStart={initialAutoStart || Boolean(initialPrompt.trim())}
        initialBuildStrategy={
          initialStrategy === "build_now" || initialStrategy === "plan_first"
            ? initialStrategy
            : "build_now"
        }
        initialModelId={initialModel || undefined}
        project={null}
      />
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-[14px] font-medium text-foreground">Could not open builder</p>
        <p className="max-w-sm text-[13px] text-muted-foreground">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-medium text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="size-5 animate-spin text-muted-foreground/40" strokeWidth={1.75} />
    </div>
  );
}
