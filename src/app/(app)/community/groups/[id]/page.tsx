import { GroupPageClient } from "@/components/community/group-page";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GroupPageClient groupId={id} />;
}
