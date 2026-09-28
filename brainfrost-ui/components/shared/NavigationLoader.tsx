"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingScreen } from "./LoadingScreen";

const NAVIGATION_START_EVENT = "brainfrost:navigation-start";
const MIN_VISIBLE_MS = 1500;
const MASCOTS = [
  "/mascot/yeti-video-ezgif.com-crop.gif",
  "/mascot/yeti-laptop-ezgif.com-crop.gif",
  "/mascot/yeti-sleeping-video-ezgif.com-crop.gif",
] as const;

/** Aviso para ações que usam router.push/replace em vez de um <Link>. */
export function announceNavigation() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
  }
}

export function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [pending, setPending] = useState(false);
  const [mascotIndex, setMascotIndex] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (startedAt.current === null) return;
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const timeout = window.setTimeout(() => {
      startedAt.current = null;
      setPending(false);
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [routeKey]);

  useEffect(() => {
    const start = () => {
      startedAt.current = Date.now();
      setMascotIndex((current) => (current + 1) % MASCOTS.length);
      setPending(true);
    };

    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const destination = new URL(href, window.location.href);
      if (
        destination.origin === window.location.origin &&
        (destination.pathname !== window.location.pathname ||
          destination.search !== window.location.search)
      ) {
        start();
      }
    };

    window.addEventListener(NAVIGATION_START_EVENT, start);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener(NAVIGATION_START_EVENT, start);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(() => setPending(false), 12_000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  if (!pending) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/10 px-4 backdrop-blur-[1px]">
      <LoadingScreen
        popup
        message="abrindo caminho"
        mascot={MASCOTS[mascotIndex]}
      />
    </div>
  );
}
