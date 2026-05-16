import type { Metadata } from "next";
import { ProjectsView } from "@/components/apps/projects-view";

export const metadata: Metadata = {
  title: "Your Apps",
};

export default function AppsPage() {
  return <ProjectsView />;
}
