"use client";

import { useEffect } from "react";
import { useSaas } from "@/lib/saas-mock";

export function ThemeApplicator() {
  const theme = useSaas((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return null;
}
