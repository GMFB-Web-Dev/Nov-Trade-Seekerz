"use client";

import { useEffect } from "react";
import { navigationUnreadEvent } from "@/lib/navigation-unread";

export function SyncNavigationUnread({ jobCount }: { jobCount: number }) {
  useEffect(() => {
    window.dispatchEvent(new Event(navigationUnreadEvent));
  }, [jobCount]);

  return null;
}
