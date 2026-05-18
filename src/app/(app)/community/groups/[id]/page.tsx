import { GroupPageClient } from "@/components/community/group-page";

export default function GroupPage({ params }: { params: { id: string } }) {
  return <GroupPageClient groupId={params.id} />;
}
