import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { OsHome } from "@/components/os-home/os-home";
import { PublicLanding } from "@/components/marketing/public-landing";

export const metadata: Metadata = {
  title: "Home",
  description: "The AI-native operating system for building software.",
};

function OsHomeFallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center text-[13px] text-muted-foreground">
      Loading…
    </div>
  );
}
/**
 * `/` — Logged-in OS home, or public marketing landing when anonymous.
 *
 * Submitting a prompt from the home quick bar navigates to /create (workspace).
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <PublicLanding />;
  }

  const { data: recentProjects } = await supabase
    .from("projects")
    .select("id, name, gradient, status, updated_at, preview_url, icon_url")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(8);

  return (
    <Suspense fallback={<OsHomeFallback />}>
      <OsHome recentProjects={recentProjects ?? []} />
    </Suspense>
  );}
