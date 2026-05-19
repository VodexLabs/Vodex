"use client";

import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { createChatFetch } from "@/lib/chat/create-chat-fetch";

export type ChatTransportBody = {
  modelId: string;
  mode: "discuss" | "edit" | "build";
  scope?: string | null;
  projectId?: string;
  conversationId?: string;
  attachmentIds?: string[];
};

export function createDreamChatTransport({
  getBody,
  on402,
  onSuccess,
  label,
}: {
  getBody: () => ChatTransportBody;
  on402?: () => void;
  onSuccess?: () => void;
  label?: string;
}) {
  return new DefaultChatTransport<UIMessage>({
    api: "/api/chat",
    fetch: (reqInput, init) =>
      createChatFetch(reqInput, init, {
        label: label ?? "chat",
        on402,
        onSuccess,
      }),
    prepareSendMessagesRequest: ({ id, messages, body, trigger, messageId }) => {
      const extra = getBody();
      return {
        body: {
          ...(body ?? {}),
          id,
          messages,
          trigger,
          messageId,
          modelId: extra.modelId,
          mode: extra.mode,
          scope: extra.scope ?? undefined,
          projectId: extra.projectId,
          conversationId: extra.conversationId,
          attachmentIds: extra.attachmentIds,
        },
      };
    },
  });
}
