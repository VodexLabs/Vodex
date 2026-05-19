import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ImmersiveWorkspace } from "@/components/create/workspace/immersive-workspace";
import { Loader2 } from "lucide-react";

const VALID_MODES = ["discuss", "edit", "build"] as const;
type Mode = (typeof VALID_MODES)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ appId: string }>;
}): Promise<Metadata> {
  const { appId } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", appId)
    .maybeSingle();
  return {
    title: project?.name ?? "App builder",
    description: "Build and iterate on your app with AI.",
  };
}

export default async function AppBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ appId: string }>;
  searchParams: Promise<{ prompt?: string; mode?: string }>;
}) {
  const { appId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { prompt, mode } = await searchParams;
  const initialMode: Mode = VALID_MODES.includes(mode as Mode) ? (mode as Mode) : "build";

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, preview_url, icon_url, gradient, status, framework, custom_domain, is_public, metadata, published_subdomain")
    .eq("id", appId)
    .eq("owner_id", user.id)
    .single();

  if (error || !project) notFound();

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="size-5 animate-spin text-muted-foreground/40" strokeWidth={1.75} />
        </div>
      }
    >
      <ImmersiveWorkspace initialPrompt={prompt ?? ""} initialMode={initialMode} project={project} />
    </Suspense>
  );
}
