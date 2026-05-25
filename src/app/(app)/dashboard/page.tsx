import { redirect } from "next/navigation";

/** Legacy workspace hub — redirect to real OS home (approved removal/hide). */
export default function DashboardPage() {
  redirect("/");
}
