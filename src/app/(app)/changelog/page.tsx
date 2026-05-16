import type { Metadata } from "next";
import { ChangelogView } from "@/components/changelog/changelog-view";

export const metadata: Metadata = { title: "Changelog" };
export default function ChangelogPage() { return <ChangelogView />; }
