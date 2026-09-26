"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MockConfig } from "./saas-types";

export type Theme = "dark" | "light";

interface SaasState {
  config: MockConfig;
  theme: Theme;
  sidebarCollapsed: boolean;

  toggleTheme: () => void;
  toggleSidebar: () => void;
  setConfig: (patch: Partial<MockConfig>) => void;
}

const DEFAULTS = {
  theme: "dark" as Theme,
  sidebarCollapsed: false,
  config: {
    llmProvider: "claude" as const,
    apiKey: "",
    deepAnalysis: false,
  },
};

export const useSaas = create<SaasState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setConfig: (patch) =>
        set((s) => ({ config: { ...s.config, ...patch } })),
    }),
    { name: "brainfrost.saas.mock.v1" }
  )
);
