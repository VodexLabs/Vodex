import type { Metadata } from "next";
import { ChatView } from "@/components/chat/chat-view";

export const metadata: Metadata = {
  title: "AI Chat",
};

export default function ChatPage() {
  return <ChatView />;
}
