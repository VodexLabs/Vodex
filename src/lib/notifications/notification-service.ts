import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { isDreamosOwnerEmail } from "@/lib/admin-owner";
import type { Notification } from "@/lib/supabase/types";
import { legacyTypeForKind, type NotificationKind } from "@/lib/notifications/notification-kinds";

export type InsertNotificationInput = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  actionUrl?: string | null;
  read?: boolean;
  metadata?: Record<string, unknown>;
};

export async function insertNotificationForUser(
  db: SupabaseClient,
  input: InsertNotificationInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const type = legacyTypeForKind(input.kind);
  const { data, error } = await db
    .from("notifications")
    .insert({
      user_id: input.userId,
      type,
      title: input.title,
      body: input.body,
      read: input.read ?? false,
      action_url: input.actionUrl ?? null,
      metadata: { kind: input.kind, ...(input.metadata ?? {}) },
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return { ok: false, error: error?.message ?? "insert_failed" };
  }
  return { ok: true, id: data.id };
}

export async function listNotificationsForCurrentUser(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[notifications] list failed:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getUnreadNotificationCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);
  return !error;
}

/** Ensure platform owner is always included in broadcast recipient lists. */
export async function resolveBroadcastRecipientIds(input: {
  db: SupabaseClient;
  profileIds: string[];
  ownerUserId?: string | null;
}): Promise<string[]> {
  const set = new Set(input.profileIds.filter(Boolean));
  if (input.ownerUserId) set.add(input.ownerUserId);
  return [...set];
}

export async function verifyNotificationsReadable(
  db: SupabaseClient,
  userId: string,
  title: string,
): Promise<number> {
  const { data } = await db
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("title", title)
    .limit(20);
  return data?.length ?? 0;
}

export async function getOwnerUserIdForBroadcast(db: SupabaseClient): Promise<string | null> {
  const admin = createServiceRoleClient();
  const client = admin ?? db;
  const { data } = await client.from("profiles").select("id, email").limit(5000);
  const owner = (data ?? []).find((p) => isDreamosOwnerEmail(p.email));
  return owner?.id ?? null;
}

export async function insertAdminBroadcastNotifications(input: {
  recipientUserIds: string[];
  title: string;
  body: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{
  insertedCount: number;
  insertedUserIds: string[];
  insertedIds: string[];
  failedChunks: number;
}> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return { insertedCount: 0, insertedUserIds: [], insertedIds: [], failedChunks: 1 };
  }

  const CHUNK = 400;
  let insertedCount = 0;
  const insertedUserIds: string[] = [];
  const insertedIds: string[] = [];
  let failedChunks = 0;

  const rowTemplate = {
    type: "system" as const,
    title: input.title,
    body: input.body,
    read: false,
    action_url: input.actionUrl ?? null,
    metadata: { kind: "admin_message", ...(input.metadata ?? {}) },
  };

  for (let i = 0; i < input.recipientUserIds.length; i += CHUNK) {
    const chunkIds = input.recipientUserIds.slice(i, i + CHUNK);
    const rows = chunkIds.map((userId) => ({ user_id: userId, ...rowTemplate }));
    const { data, error } = await admin.from("notifications").insert(rows).select("id, user_id");
    if (error) {
      failedChunks += 1;
      continue;
    }
    insertedCount += data?.length ?? rows.length;
    for (const row of data ?? []) {
      if (row.user_id) insertedUserIds.push(row.user_id);
      if (row.id) insertedIds.push(row.id);
    }
  }

  return { insertedCount, insertedUserIds, insertedIds, failedChunks };
}

/** Server route helper — current session user notifications. */
export async function listNotificationsForSession(limit = 50) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, notifications: [] as Notification[], unreadCount: 0 };
  const notifications = await listNotificationsForCurrentUser(supabase, user.id, limit);
  const unreadCount = await getUnreadNotificationCount(supabase, user.id);
  return { user, notifications, unreadCount };
}
