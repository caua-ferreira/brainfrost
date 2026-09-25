"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Pencil, X } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { getSupabase } from "@/lib/supabase/client";
import { useSuggestions, useCategories } from "@/lib/supabase/hooks";
import type { Database } from "@/lib/supabase/database.types";

type SuggestionRow = Database["public"]["Tables"]["pattern_suggestions"]["Row"];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

export default function CuradoriaPage() {
  const theme = useSaas((s) => s.theme);
  const c = palette(theme);
  const { suggestions, loading, refresh } = useSuggestions("pending");
  const categories = useCategories();

  const accept = async (s: SuggestionRow, overrides?: Partial<SuggestionRow>) => {
    const supabase = getSupabase();
    const title = overrides?.title ?? s.title;
    const body = overrides?.body ?? s.body;
    const category = overrides?.category ?? s.category;

    const { data: note, error: noteErr } = await supabase
      .from("vault_notes")
      .insert({
        slug: `${slugify(title)}_${s.id.slice(0, 6)}`,
        title,
        body,
        category,
      })
      .select("id, slug")
      .single();

    if (noteErr || !note) {
      alert(noteErr?.message ?? "Erro ao criar camada.");
      return;
    }

    // Conecta a nova camada com as outras da mesma categoria — evita cofre virar
    // um monte de nós soltos no grafo. Limita a 8 pra não gerar hairball.
    const { data: siblings } = await supabase
      .from("vault_notes")
      .select("slug")
      .eq("category", category)
      .neq("id", note.id)
      .order("updated_at", { ascending: false })
      .limit(8);

    if (siblings && siblings.length > 0) {
      await supabase.from("vault_links").insert(
        siblings.map((sib) => ({ from_note_id: note.id, to_slug: sib.slug }))
      );
    }

    await supabase
      .from("pattern_suggestions")
      .update({ status: "accepted", accepted_note_id: note.id })
      .eq("id", s.id);
    refresh();
  };

  const reject = async (id: string) => {
    await getSupabase().from("pattern_suggestions").update({ status: "rejected" }).eq("id", id);
    refresh();
  };

  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden" style={{ background: c.bg }}>
      <div
        className="pointer-events-none absolute -right-32 top-0 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: c.accent, opacity: 0.10 }}
      />
      <div
        className="pointer-events-none absolute -left-32 top-72 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: c.aurora, opacity: 0.07 }}
      />

      <div className="relative mx-auto max-w-4xl px-6 py-16 md:py-20">
        <h1
          className="text-[42px] font-semibold leading-[1.02] tracking-tight md:text-[56px]"
          style={{ color: c.text }}
        >
          {suggestions.length > 0 ? (
            <>
              {suggestions.length} sugestões
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(to right, ${c.accent}, ${c.aurora})` }}
              >
                esperando você.
              </span>
            </>
          ) : (
            <>
              Nada pendente.
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(to right, ${c.accent}, ${c.aurora})` }}
              >
                Você está em dia.
              </span>
            </>
          )}
        </h1>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed" style={{ color: c.dim }}>
          Cada aceite vira uma camada no seu cofre. Rejeitar não apaga: só ignora.
        </p>

        <div className="mt-12">
          {loading ? (
            <p className="py-12 text-center text-[13px]" style={{ color: c.dim }}>
              carregando…
            </p>
          ) : suggestions.length === 0 ? (
            <p className="py-12 text-center text-[14px]" style={{ color: c.dim }}>
              Nada por aqui. Volte depois de{" "}
              <Link href="/importar" className="underline underline-offset-4" style={{ color: c.accent }}>
                importar mais um repo
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-3">
              {suggestions.map((s) => (
                <SuggestionRow
                  key={s.id}
                  c={c}
                  s={s}
                  categories={categories}
                  onAccept={(overrides) => accept(s, overrides)}
                  onReject={() => reject(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SuggestionRow({
  c,
  s,
  categories,
  onAccept,
  onReject,
}: {
  c: ReturnType<typeof palette>;
  s: SuggestionRow;
  categories: Database["public"]["Tables"]["categories"]["Row"][];
  onAccept: (overrides?: Partial<SuggestionRow>) => void;
  onReject: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(s.title);
  const [body, setBody] = useState(s.body);
  const [category, setCategory] = useState(s.category);

  const catLabel = useMemo(
    () => categories.find((cat) => cat.id === category)?.label ?? category,
    [categories, category]
  );

  return (
    <article
      className="rounded-2xl border p-5 transition-colors"
      style={{ background: c.card, borderColor: c.border }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-b bg-transparent px-0 pb-1 text-[17px] font-semibold outline-none"
              style={{ color: c.text, borderColor: c.border }}
            />
          ) : (
            <h3 className="text-[17px] font-semibold leading-snug" style={{ color: c.text }}>
              {title}
            </h3>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
            {editing ? (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-full border bg-transparent px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest outline-none"
                style={{ color: c.accent, borderColor: c.border, background: c.card }}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} style={{ background: c.card, color: c.text }}>
                    {cat.label}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className="rounded-full px-2 py-0.5"
                style={{ background: `${c.accent}18`, color: c.accent }}
              >
                {catLabel}
              </span>
            )}
            {s.evidence && <span style={{ color: c.dim }}>{s.evidence}</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconBtn c={c} onClick={() => setEditing((v) => !v)} title={editing ? "Concluir edição" : "Editar"} tone="dim">
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
          </IconBtn>
          <IconBtn c={c} onClick={onReject} title="Rejeitar" tone="danger">
            <X className="h-4 w-4" strokeWidth={2} />
          </IconBtn>
          <IconBtn
            c={c}
            onClick={() => onAccept(editing ? { title, body, category } : undefined)}
            title="Aceitar"
            tone="accept"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
          </IconBtn>
        </div>
      </div>

      {editing ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-4 w-full resize-y bg-transparent p-0 text-[14px] leading-relaxed outline-none"
          style={{ minHeight: 120, color: c.text }}
        />
      ) : (
        <p className="mt-4 max-w-2xl text-[14px] leading-relaxed" style={{ color: c.dim }}>
          {body}
        </p>
      )}
    </article>
  );
}

function IconBtn({
  c,
  children,
  onClick,
  title,
  tone,
}: {
  c: ReturnType<typeof palette>;
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  tone: "dim" | "accept" | "danger";
}) {
  const bg =
    tone === "accept" ? `${c.aurora}22` : tone === "danger" ? "rgba(230, 60, 90, 0.15)" : "transparent";
  const color = tone === "accept" ? c.aurora : tone === "danger" ? "#ff6b81" : c.dim;
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:brightness-110"
      style={{ background: bg, color }}
    >
      {children}
    </button>
  );
}
