"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { messageReadEvent, navigationUnreadEvent } from "./navigation-unread";
import type { Database } from "./database.types";

export type ActivityConnection = { userId: string; url: string; key: string };
type NavigationUnread = { userId: string | null; messages: boolean; jobs: boolean };
type Activity = "message" | "message-read" | "notification" | "resync";

export function useLiveActivity(connection: ActivityConnection | undefined, pathname: string) {
  const router = useRouter();
  const [unread, setUnread] = useState<NavigationUnread | null>(null);
  const { userId, url, key } = connection ?? {};
  const affectsCurrentView = useEffectEvent((activity: Activity, projectId?: string) => {
    if (pathname === "/messages") return true;
    if (pathname === "/dashboard") return activity === "notification" || activity === "resync";
    if (activity === "message") return Boolean(projectId) && pathname === `/projects/${projectId}`;
    return activity === "resync" && /^\/projects\/[^/]+$/.test(pathname) && pathname !== "/projects/new";
  });

  useEffect(() => {
    if (!userId || !url || !key) return;
    let stopped = false;
    let connected = false;
    let refreshView = false;
    let pending: number | undefined;
    let request: AbortController | undefined;
    let unsubscribe: (() => void) | undefined;

    async function updateUnread() {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      try {
        const response = await fetch("/api/nav-unread", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const next: NavigationUnread = await response.json();
        if (!controller.signal.aborted) setUnread(next.userId === userId ? next : null);
      } catch {
        // Keep the current badges until the next successful sync.
      }
    }

    function sync(activity?: Activity, projectId?: string) {
      if (stopped || document.hidden) return;
      refreshView ||= Boolean(activity && affectsCurrentView(activity, projectId));
      if (pending !== undefined) return;
      // Job actions and read receipts can deliver several events together.
      pending = window.setTimeout(() => {
        pending = undefined;
        if (refreshView) router.refresh();
        refreshView = false;
        void updateUnread();
      }, 120);
    }

    const subscribe = async () => {
      const { createBrowserClient } = await import("@supabase/ssr");
      if (stopped) return;
      const client = createBrowserClient<Database>(url, key, { auth: { detectSessionInUrl: false } });
      await client.realtime.setAuth();
      if (stopped) return;
      const channel = client.channel(`inbox:${userId}`, { config: { private: true } })
        .on("broadcast", { event: "message" }, ({ payload }) => sync("message", payload?.projectId))
        .on("broadcast", { event: "message-read" }, () => sync("message-read"))
        .on("broadcast", { event: "notification" }, () => sync("notification"))
        .subscribe((status) => {
          connected = status === "SUBSCRIBED";
          if (connected) sync("resync");
        });
      unsubscribe = () => { void client.removeChannel(channel); };
    };

    const syncUnread = () => sync();
    const syncRead = () => sync("message-read");
    const resync = () => sync("resync");
    syncUnread();
    void subscribe().catch(() => { connected = false; });
    const fallback = window.setInterval(() => { if (!connected) resync(); }, 30_000);
    window.addEventListener("focus", resync);
    window.addEventListener(navigationUnreadEvent, syncUnread);
    window.addEventListener(messageReadEvent, syncRead);
    document.addEventListener("visibilitychange", resync);
    return () => {
      stopped = true;
      request?.abort();
      window.clearTimeout(pending);
      window.clearInterval(fallback);
      window.removeEventListener("focus", resync);
      window.removeEventListener(navigationUnreadEvent, syncUnread);
      window.removeEventListener(messageReadEvent, syncRead);
      document.removeEventListener("visibilitychange", resync);
      unsubscribe?.();
    };
  }, [userId, url, key, router]);

  return unread?.userId === userId ? unread : null;
}
