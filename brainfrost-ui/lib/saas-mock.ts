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
  theme: "light" as Theme,
  sidebarCollapsed: false,
  config: {
    llmProvider: "webllm" as const,
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
    {
      name: "brainfrost.saas.mock.v2",
      version: 3,
      migrate: (persisted: unknown) => {
        const state = (persisted ?? {}) as Partial<SaasState>;
        const config = { ...DEFAULTS.config, ...(state.config ?? {}) };
        // Versões antigas começavam em um provedor pago mesmo sem chave. Só
        // corrigimos esse caso; quem digitou uma chave mantém a preferência.
        if ((config.llmProvider === "claude" || config.llmProvider === "gemini") && !config.apiKey.trim()) {
          config.llmProvider = "webllm";
        }
        return { ...DEFAULTS, ...state, config };
      },
    }
  )
);
