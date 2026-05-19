import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminView } from "@/components/admin/admin-view";
import { isDreamosOwnerEmail } from "@/lib/admin-owner";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  if (!isDreamosOwnerEmail(user.email)) {
    redirect("/");
  }

  return <AdminView />;
}
