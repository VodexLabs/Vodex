import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppProjectDashboard } from "@/components/apps/app-project-dashboard";
import { ArrowLeft, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    title: project?.name ?? "App dashboard",
    description: "Overview, metrics, and settings for a single app.",
  };
}

export default async function AppDashboardPage({ params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, status, preview_url, custom_domain, framework, gradient, is_public, metadata")
    .eq("id", appId)
    .eq("owner_id", user.id)
    .single();

  if (error || !project) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/projects"
            className="mb-2 inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition hover:text-accent"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2} />
            Your apps
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{project.name}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            This dashboard is scoped to this app only — not your global workspace hub.
          </p>
        </div>
        <Button variant="accent" size="md" asChild>
          <Link href={`/apps/${appId}/builder`} className="gap-2">
            <Hammer className="size-4" strokeWidth={1.75} />
            Open builder
          </Link>
        </Button>
      </div>

      <AppProjectDashboard project={project} />
    </div>
  );
}
