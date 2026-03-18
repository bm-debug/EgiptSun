"use client";

import { ChatProvider } from "./ChatContext";
import { ChatSidebar } from "./ChatSidebar";

export function ChatLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <div className="flex min-h-svh w-full min-w-0">
        <div className="flex-1 min-w-0 flex flex-col">{children}</div>
        <ChatSidebar />
      </div>
    </ChatProvider>
  );
}
