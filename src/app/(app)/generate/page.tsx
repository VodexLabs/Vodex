import type { Metadata } from "next";
import { GenerationWorkspace } from "@/components/generate/generation-workspace";

export const metadata: Metadata = {
  title: "Generating — DreamOS86",
};

export default function GeneratePage() {
  return <GenerationWorkspace />;
}
