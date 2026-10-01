"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "brainfrost.analytics.session";
const ACTIVE_WINDOW_MS = 60_000;
const HEARTBEAT_SECONDS = 30;

function getSessionId() {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

function sendActivity(payload: Record<string, unknown>) {
  return fetch("/api/analytics/activity", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

export function ProductAnalytics() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string | null>(null);
  const lastInteractionRef = useRef(Date.now());

  useEffect(() => {
    sessionIdRef.current = getSessionId();
    const markInteraction = () => { lastInteractionRef.current = Date.now(); };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, markInteraction, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, markInteraction));
  }, []);

  useEffect(() => {
    const sessionId = sessionIdRef.current ?? getSessionId();
    sessionIdRef.current = sessionId;
    void sendActivity({ sessionId, path: pathname, event: "page_view", activeSeconds: 0 });
  }, [pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const recentlyActive = Date.now() - lastInteractionRef.current <= ACTIVE_WINDOW_MS;
      if (document.visibilityState !== "visible" || !document.hasFocus() || !recentlyActive) return;
      const sessionId = sessionIdRef.current ?? getSessionId();
      sessionIdRef.current = sessionId;
      void sendActivity({
        sessionId,
        path: window.location.pathname,
        event: "heartbeat",
        activeSeconds: HEARTBEAT_SECONDS,
      });
    }, HEARTBEAT_SECONDS * 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
