import type { Metadata } from "next";
import { WaitlistView } from "@/components/auth/waitlist-view";

export const metadata: Metadata = { title: "Join the Waitlist" };

export default function WaitlistPage() {
  return <WaitlistView />;
}
