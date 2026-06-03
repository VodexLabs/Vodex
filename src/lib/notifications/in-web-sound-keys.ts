import type { Notification } from "@/lib/supabase/types";
import { readNotificationKind } from "@/lib/notifications/notification-kinds";

export type InWebSoundKey =
  | "inbox_message"
  | "build_completed"
  | "build_failed"
  | "prompt_finished"
  | "credits_warning"
  | "workspace_event";

export const IN_WEB_SOUND_KEYS: InWebSoundKey[] = [
  "inbox_message",
  "build_completed",
  "build_failed",
  "prompt_finished",
  "credits_warning",
  "workspace_event",
];

export const IN_WEB_SOUND_LABELS: Record<
  InWebSoundKey,
  { title: string; description: string }
> = {
  inbox_message: {
    title: "Inbox message",
    description: "New notification in your bell inbox",
  },
  build_completed: {
    title: "Build completed",
    description: "When an app build finishes successfully",
  },
  build_failed: {
    title: "Build failed",
    description: "When a build stops with an error",
  },
  prompt_finished: {
    title: "Prompt / task finished",
    description: "When an AI builder task completes",
  },
  credits_warning: {
    title: "Credits warning",
    description: "Low or exhausted build/action credits",
  },
  workspace_event: {
    title: "Workspace & collaboration",
    description: "Invites, members, and collaborator updates",
  },
};

export function defaultInWebSounds(): Record<InWebSoundKey, boolean> {
  return {
    inbox_message: true,
    build_completed: true,
    build_failed: true,
    prompt_finished: true,
    credits_warning: true,
    workspace_event: true,
  };
}

/** Map a notification row to which in-web sound category applies. */
export function resolveInWebSoundKey(n: Notification): InWebSoundKey {
  const kind = readNotificationKind(n);
  if (kind === "build_failed") return "build_failed";
  if (kind === "build_completed") return "build_completed";
  if (kind === "build_started") return "prompt_finished";
  if (kind === "credits_low") return "credits_warning";
  if (
    kind?.startsWith("workspace_") ||
    kind?.startsWith("collaborator_") ||
    n.type === "invite"
  ) {
    return "workspace_event";
  }
  if (n.type === "build") return "build_completed";
  if (n.type === "credit") return "credits_warning";
  if (n.type === "ai") return "prompt_finished";
  return "inbox_message";
}
