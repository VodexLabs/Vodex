import type { ChatTransportBody } from "@/lib/chat/create-chat-transport";

export type AsyncBuildEnqueueResponse = {
  ok?: boolean;
  asyncBuild?: boolean;
  buildJobId?: string;
  operationId?: string;
  projectId?: string;
  conversationId?: string | null;
  eventsUrl?: string;
  error?: string;
  code?: string;
};

export async function enqueueAsyncBuild(input: {
  messages: unknown[];
  body: ChatTransportBody & { operationId?: string; idempotencyKey?: string };
}): Promise<AsyncBuildEnqueueResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-DreamOS-Async-Build": "1",
    },
    credentials: "include",
    body: JSON.stringify({
      messages: input.messages,
      ...input.body,
      mode: "build",
    }),
  });

  const data = (await res.json()) as AsyncBuildEnqueueResponse & {
    tokens_remaining?: number;
    tokens_required?: number;
  };

  if (res.status === 402) {
    const err = new Error(data.error ?? "Insufficient credits");
    (err as Error & { code?: string }).code = data.code ?? "insufficient_tokens";
    throw err;
  }

  if (!res.ok) {
    throw new Error(data.error ?? `Build enqueue failed (${res.status})`);
  }

  if (!data.asyncBuild || !data.buildJobId || !data.eventsUrl) {
    throw new Error("Server did not return async build job");
  }

  return data;
}
