import type { Metadata } from "next";
import { PublicBuilderProfileView } from "@/components/community/public-builder-profile-view";

export const metadata: Metadata = { title: "Builder profile" };

export default async function BuilderProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PublicBuilderProfileView username={username} />;
}
