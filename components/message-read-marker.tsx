"use client";

import { useEffect, useRef } from "react";
import { markMessageThreadRead } from "@/app/actions/message-read";
import { messageReadEvent } from "@/lib/navigation-unread";

export function MessageReadMarker({ lastMessageId }: { lastMessageId: string }) {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = marker.current;
    if (!target) return;
    let visible = false;
    let pending = false;

    function markWhenVisible() {
      if (!visible || document.visibilityState !== "visible" || pending) return;
      pending = true;
      void markMessageThreadRead(lastMessageId).then((success) => {
        if (!success) {
          pending = false;
          return;
        }
        window.dispatchEvent(new Event(messageReadEvent));
      }).catch(() => {
        pending = false;
      });
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      markWhenVisible();
    });
    observer.observe(target);
    document.addEventListener("visibilitychange", markWhenVisible);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", markWhenVisible);
    };
  }, [lastMessageId]);

  return <span ref={marker} className="message-read-marker" aria-hidden="true" />;
}
