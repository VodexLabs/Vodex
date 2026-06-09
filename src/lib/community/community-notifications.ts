import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createUserNotification } from "@/lib/notifications/create-user-notification";
import type { NotificationKind } from "@/lib/notifications/notification-kinds";

export async function notifyCommunityEvent(
  admin: SupabaseClient,
  input: {
    userId: string;
    kind: NotificationKind;
    title: string;
    body: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await createUserNotification(admin, {
    userId: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    actionUrl: input.actionUrl ?? "/community",
    iconKey: "heart",
    metadata: input.metadata,
  });
}
