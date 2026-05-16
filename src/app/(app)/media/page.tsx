import type { Metadata } from "next";
import { MediaView } from "@/components/media/media-view";

export const metadata: Metadata = { title: "Media & Assets" };
export default function MediaPage() { return <MediaView />; }
