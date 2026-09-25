"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MockConfig, MockImport, MockSuggestion, SuggestionStatus } from "./saas-types";

export type Theme = "dark" | "light";

interface SaasState {
  imports: MockImport[];
  suggestions: MockSuggestion[];
  vaultLayers: number;
  config: MockConfig;
  theme: Theme;
  sidebarCollapsed: boolean;

  toggleTheme: () => void;
  toggleSidebar: () => void;
  createImport: (partial: Omit<MockImport, "id" | "status" | "createdAt">) => string;
  finishImport: (importId: string) => void;
  updateSuggestion: (id: string, patch: Partial<MockSuggestion>) => void;
  setSuggestionStatus: (id: string, status: SuggestionStatus) => void;
  setConfig: (patch: Partial<MockConfig>) => void;
  reset: () => void;
}

const SEED_SUGGESTIONS: MockSuggestion[] = [
  {
    id: "s1",
    importId: "seed",
    title: "RLS por auth.uid() em toda tabela multiusuário",
    body: "Toda tabela com dado por pessoa aplica policy `USING (auth.uid() = user_id)` e trigger de dono no insert. Único por (user_id, chave), nunca global.",
    category: "padroes_arquitetura",
    evidence: "supabase/migrations/0001_init.sql:12",
    status: "pending",
  },
  {
    id: "s2",
    importId: "seed",
    title: "Fallback de env em lib/supabase/config.ts",
    body: "Deploy pelo conector da Vercel não grava env. URL e anon key vão como fallback de `process.env` no arquivo `lib/supabase/config.ts`.",
    category: "padrao_webapp",
    evidence: "lib/supabase/config.ts:3",
    status: "pending",
  },
  {
    id: "s3",
    importId: "seed",
    title: "Debounce de 700ms no auto-save",
    body: "Patch acumulado em ref e gravado com debounce de 700ms. Também dispara ao trocar de dia ou esconder a aba.",
    category: "padroes_codigo",
    evidence: "components/DailyPlanner.tsx:184",
    status: "pending",
  },
  {
    id: "s4",
    importId: "seed",
    title: "Alvo de toque grande e fonte legível",
    body: "Mobile-first com alvo de toque >= 44px, fonte base 16px, nada de hover como único caminho para uma ação.",
    category: "padrao_webapp",
    evidence: "app/globals.css:8",
    status: "pending",
  },
  {
    id: "s5",
    importId: "seed",
    title: "GMUD antes de mudança em produção",
    body: "Alteração em Control-M, Airflow ou Jenkins exige GMUD. Antes de propor mudança, listar o que quebra se o passo anterior atrasar.",
    category: "contexto_trabalho",
    evidence: "docs/deploy.md:44",
    status: "pending",
  },
];

const SEED_IMPORTS: MockImport[] = [
  {
    id: "imp-seed",
    source: "github",
    label: "caua-ferreira/permafrost-platform",
    fileCount: 42,
    status: "pronto",
    createdAt: "2026-09-22T14:12:00Z",
  },
];

const DEFAULTS = {
  imports: SEED_IMPORTS,
  suggestions: SEED_SUGGESTIONS,
  vaultLayers: 11,
  theme: "dark" as Theme,
  sidebarCollapsed: false,
  config: {
    llmProvider: "claude" as const,
    apiKey: "",
    deepAnalysis: false,
  },
};

const rid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export const useSaas = create<SaasState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      createImport: (partial) => {
        const id = rid("imp");
        const next: MockImport = {
          ...partial,
          id,
          status: "analisando",
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ imports: [next, ...s.imports] }));
        return id;
      },
      finishImport: (importId) =>
        set((s) => ({
          imports: s.imports.map((i) =>
            i.id === importId ? { ...i, status: "pronto" } : i
          ),
        })),

      updateSuggestion: (id, patch) =>
        set((s) => ({
          suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      setSuggestionStatus: (id, status) =>
        set((s) => {
          const accepting = status === "accepted";
          return {
            suggestions: s.suggestions.map((x) => (x.id === id ? { ...x, status } : x)),
            vaultLayers: accepting ? s.vaultLayers + 1 : s.vaultLayers,
          };
        }),

      setConfig: (patch) =>
        set((s) => ({ config: { ...s.config, ...patch } })),

      reset: () => set(DEFAULTS),
    }),
    { name: "brainfrost.saas.mock.v1" }
  )
);
