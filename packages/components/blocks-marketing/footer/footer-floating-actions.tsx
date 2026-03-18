"use client";

import { ArrowUp } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePublicContent } from "@/contexts/PublicContentContext";
import { ChatTriggerButton, useChatOptional } from "@/packages/components/blocks-app/chat";

const floatingBtnClass = "h-11 w-11 rounded-full shadow-lg border-0";

export function ScrollToTopFloating({ showToTop = true }: { showToTop?: boolean }) {
  const { footer } = usePublicContent();
  const fromContent = (footer as Record<string, unknown>)?.show_to_top !== false;
  const visible = showToTop && fromContent;

  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    const check = () => setStickyVisible(typeof window !== "undefined" && window.scrollY >= window.innerHeight);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (!visible) return null;

  return (
    <div
      className={
        stickyVisible
          ? "fixed bottom-6 left-6 z-9999 opacity-100 md:left-8"
          : "fixed bottom-6 left-6 z-9999 pointer-events-none opacity-0 transition-opacity duration-300 md:left-8"
      }
      aria-hidden={!stickyVisible}
    >
      <Button
        size="icon"
        variant="primary"
        className={floatingBtnClass}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ChatFloating({ showChat = true }: { showChat?: boolean }) {
  const { footer } = usePublicContent();
  const hasChat = useChatOptional();
  const fromContent = (footer as Record<string, unknown>)?.show_chat !== false;
  const visible = showChat && fromContent && hasChat && !hasChat.isOpen;

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-9999 md:right-8">
      <ChatTriggerButton variant="primary" size="icon" className={floatingBtnClass} />
    </div>
  );
}
