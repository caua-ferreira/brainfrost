"use client";

import { useEffect } from "react";

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function AttributionCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const attribution: Record<string, string> = {};
    const hasSavedAttribution = document.cookie
      .split(";")
      .some((cookie) => cookie.trim().startsWith("brainfrost_attribution="));
    for (const key of KEYS) {
      const value = params.get(key)?.trim();
      if (value) attribution[key] = value.slice(0, 160);
    }

    if (!attribution.utm_source && document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        if (referrer.origin !== window.location.origin) attribution.referrer = referrer.hostname.slice(0, 160);
      } catch {
        // Referrer inválido não impede o uso da aplicação.
      }
    }
    if (Object.keys(attribution).length === 0 && hasSavedAttribution) return;
    if (Object.keys(attribution).length === 0) attribution.source = "direct";

    attribution.landing_path = `${window.location.pathname}${window.location.search}`.slice(0, 300);
    attribution.captured_at = new Date().toISOString();
    document.cookie = `brainfrost_attribution=${encodeURIComponent(JSON.stringify(attribution))}; Max-Age=2592000; Path=/; SameSite=Lax; Secure`;
  }, []);

  return null;
}

