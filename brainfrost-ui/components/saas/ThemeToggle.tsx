"use client";

import { Moon, Sun } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";

export function ThemeToggle() {
  const theme = useSaas((s) => s.theme);
  const toggle = useSaas((s) => s.toggleTheme);
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-glow/15 bg-rift/30 text-arctic transition-colors hover:border-glow/50 data-[light=true]:border-[#08243A]/15 data-[light=true]:bg-white/60 data-[light=true]:text-[#08243A]"
      data-light={!isDark}
      aria-label={isDark ? "Modo claro" : "Modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5" strokeWidth={1.8} />
      ) : (
        <Moon className="h-3.5 w-3.5" strokeWidth={1.8} />
      )}
    </button>
  );
}
