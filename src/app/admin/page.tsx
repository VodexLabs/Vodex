import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminView } from "@/components/admin/admin-view";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  return <AdminView />;
}
