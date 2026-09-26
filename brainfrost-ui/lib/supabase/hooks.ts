"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./client";
import { DEMO_IMPORTS, DEMO_SUGGESTIONS, DEMO_VAULT_NOTES } from "./demo-data";
import type { Database } from "./database.types";
import { useIsDemo } from "@/components/saas/SessionProvider";

type ImportRow = Database["public"]["Tables"]["imports"]["Row"];
type SuggestionRow = Database["public"]["Tables"]["pattern_suggestions"]["Row"];
type VaultNoteRow = Database["public"]["Tables"]["vault_notes"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export function useImports() {
  const isDemo = useIsDemo();
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (isDemo) {
      setImports(DEMO_IMPORTS);
      setLoading(false);
      return;
    }
    const { data } = await getSupabase()
      .from("imports")
      .select("*")
      .order("created_at", { ascending: false });
    setImports(data ?? []);
    setLoading(false);
  }, [isDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { imports, loading, refresh };
}

export function useSuggestions(status: SuggestionRow["status"] | "all" = "pending") {
  const isDemo = useIsDemo();
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (isDemo) {
      const filtered = status === "all"
        ? DEMO_SUGGESTIONS
        : DEMO_SUGGESTIONS.filter((s) => s.status === status);
      setSuggestions(filtered);
      setLoading(false);
      return;
    }
    let q = getSupabase()
      .from("pattern_suggestions")
      .select("*")
      .order("created_at", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    const { data } = await q;
    setSuggestions(data ?? []);
    setLoading(false);
  }, [status, isDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { suggestions, loading, refresh };
}

export function useVaultNotes() {
  const isDemo = useIsDemo();
  const [notes, setNotes] = useState<VaultNoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (isDemo) {
      setNotes(DEMO_VAULT_NOTES);
      setLoading(false);
      return;
    }
    const { data } = await getSupabase()
      .from("vault_notes")
      .select("*")
      .order("updated_at", { ascending: false });
    setNotes(data ?? []);
    setLoading(false);
  }, [isDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { notes, loading, refresh };
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  useEffect(() => {
    getSupabase()
      .from("categories")
      .select("*")
      .order("label")
      .then(({ data }) => setCategories(data ?? []));
  }, []);
  return categories;
}

// Simula o LLM: insere sugestões fake associadas a um import.
// Substituir por chamada de LLM real na próxima etapa.
const FAKE_SUGGESTIONS: Array<Omit<Database["public"]["Tables"]["pattern_suggestions"]["Insert"], "user_id" | "import_id">> = [
  {
    title: "RLS por auth.uid() em toda tabela multiusuário",
    body: "Toda tabela com dado por pessoa aplica policy `USING (auth.uid() = user_id)` e trigger de dono no insert. Único por (user_id, chave), nunca global.",
    category: "padroes_arquitetura",
    evidence: "supabase/migrations/0001_init.sql:12",
  },
  {
    title: "Fallback de env em lib/supabase/config.ts",
    body: "Deploy pelo conector da Vercel não grava env. URL e anon key vão como fallback de `process.env` no arquivo `lib/supabase/config.ts`.",
    category: "padrao_webapp",
    evidence: "lib/supabase/config.ts:3",
  },
  {
    title: "Debounce de 700ms no auto-save",
    body: "Patch acumulado em ref e gravado com debounce de 700ms. Também dispara ao trocar de dia ou esconder a aba.",
    category: "padroes_codigo",
    evidence: "components/DailyPlanner.tsx:184",
  },
  {
    title: "Alvo de toque grande e fonte legível",
    body: "Mobile-first com alvo de toque >= 44px, fonte base 16px, nada de hover como único caminho para uma ação.",
    category: "padrao_webapp",
    evidence: "app/globals.css:8",
  },
  {
    title: "GMUD antes de mudança em produção",
    body: "Alteração em Control-M, Airflow ou Jenkins exige GMUD. Antes de propor mudança, listar o que quebra se o passo anterior atrasar.",
    category: "contexto_trabalho",
    evidence: "docs/deploy.md:44",
  },
];

export async function seedSuggestionsFromImport(importId: string) {
  const supabase = getSupabase();
  const rows = FAKE_SUGGESTIONS.map((s) => ({ ...s, import_id: importId }));
  await supabase.from("pattern_suggestions").insert(rows);
}
