import type { Metadata } from "next";
import { CreateHome } from "@/components/create/create-home";

export const metadata: Metadata = {
  title: "Create",
  description:
    "DreamOS86 — describe the app you want. A calm, premium AI-native creation canvas.",
};

export default function HomePage() {
  return <CreateHome />;
}
