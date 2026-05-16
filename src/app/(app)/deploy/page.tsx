import type { Metadata } from "next";
import { DeployView } from "@/components/deploy/deploy-view";

export const metadata: Metadata = { title: "Deployment Center" };
export default function DeployPage() { return <DeployView />; }
