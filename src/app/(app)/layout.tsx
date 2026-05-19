import { createClient } from "@/lib/supabase/server";
import { PlatformShell } from "@/components/layout/platform-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <PlatformShell homeSessionFromServer={Boolean(user)}>{children}</PlatformShell>;
}
