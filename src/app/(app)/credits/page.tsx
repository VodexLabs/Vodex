import type { Metadata } from "next";
import { CreditsView } from "@/components/credits/credits-view";

export const metadata: Metadata = {
  title: "Credits Usage",
};

export default function CreditsPage() {
  return <CreditsView />;
}
