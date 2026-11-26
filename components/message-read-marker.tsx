"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { markMessageThreadRead } from "@/app/actions/message-read";
import { navigationUnreadEvent } from "@/lib/navigation-unread";

export function MessageReadMarker({ lastMessageId, refreshInbox }: {
  lastMessageId: string;
  refreshInbox: boolean;
}) {
  const router = useRouter();
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const target = marker.current;
    if (!target) return;
    let visible = false;
    let pending = false;
    let mounted = true;

    function markWhenVisible() {
      if (!visible || document.visibilityState !== "visible" || pending) return;
      pending = true;
      void markMessageThreadRead(lastMessageId).then((success) => {
        if (!success) {
          pending = false;
          return;
        }
        window.dispatchEvent(new Event(navigationUnreadEvent));
        if (mounted && refreshInbox) router.refresh();
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
      mounted = false;
      observer.disconnect();
      document.removeEventListener("visibilitychange", markWhenVisible);
    };
  }, [lastMessageId, refreshInbox, router]);

  return <span ref={marker} className="message-read-marker" aria-hidden="true" />;
}
