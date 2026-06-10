import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyCommunityEvent } from "@/lib/community/community-notifications";

export async function notifyBuilderFollowers(
  admin: SupabaseClient,
  input: {
    builderId: string;
    builderName: string;
    kind: "app_published" | "template_published";
    title: string;
    body: string;
    actionUrl: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { data: followers } = await admin
    .from("user_follows" as never)
    .select("follower_id")
    .eq("following_id" as never, input.builderId);

  const ids = (followers ?? [])
    .map((row) => (row as { follower_id?: string }).follower_id)
    .filter((id): id is string => Boolean(id));

  await Promise.all(
    ids.map((userId) =>
      notifyCommunityEvent(admin, {
        userId,
        kind: input.kind,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
        metadata: { builder_id: input.builderId, builder_name: input.builderName, ...input.metadata },
      }),
    ),
  );
}
