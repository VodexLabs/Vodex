import type { Metadata } from "next";
import { requireServerUser } from "@/lib/auth/session";
import { CreatePageBody } from "@/components/create/create-page-body";

export const metadata: Metadata = {
  title: "Create",
  description: "Vodex create workspace — build with AI.",
};

export default async function WorkspaceCreatePage({
  searchParams,
}: {
  searchParams: Promise<{
    prompt?: string;
    projectId?: string;
    mode?: string;
    autostart?: string;
    strategy?: string;
    model?: string;
    skipDraft?: string;
  }>;
}) {
  const { prompt, projectId, mode, autostart, strategy, model, skipDraft } = await searchParams;
  const params = new URLSearchParams();
  if (prompt) params.set("prompt", prompt);
  if (projectId) params.set("projectId", projectId);
  if (mode) params.set("mode", mode);
  if (autostart) params.set("autostart", autostart);
  const nextPath = `/create${params.toString() ? `?${params.toString()}` : ""}`;
  await requireServerUser(nextPath);

  return (
    <CreatePageBody
      initialPrompt={prompt ?? ""}
      initialProjectId={projectId ?? null}
      initialMode={mode ?? "build"}
      initialAutoStart={autostart === "1" || autostart === "true"}
      initialStrategy={strategy ?? "build_now"}
      initialModel={model ?? ""}
      initialSkipDraft={skipDraft === "1" || skipDraft === "true"}
    />
  );
}
