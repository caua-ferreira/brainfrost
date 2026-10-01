"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Link2, Pencil, X } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { getSupabase } from "@/lib/supabase/client";
import { useSuggestions, useCategories } from "@/lib/supabase/hooks";
import type { Database } from "@/lib/supabase/database.types";

type SuggestionRow = Database["public"]["Tables"]["pattern_suggestions"]["Row"];

type SuggestedLink = { slug: string; reason?: string | null };

function suggestedLinks(value: unknown): SuggestedLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SuggestedLink => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return typeof row.slug === "string" && row.slug.length > 0;
  });
}

export default function CuradoriaPage() {
  const theme = useSaas((s) => s.theme);
  const c = palette(theme);
  const { suggestions, loading, refresh } = useSuggestions("pending");
  const categories = useCategories();

  const accept = async (s: SuggestionRow, overrides?: Partial<SuggestionRow>) => {
    const title = overrides?.title ?? s.title;
    const body = overrides?.body ?? s.body;
    const category = overrides?.category ?? s.category;

    const response = await fetch("/api/curadoria/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        suggestion_id: s.id,
        title,
        content: body,
        category,
        concepts: overrides?.concepts ?? s.concepts,
        links: overrides?.suggested_links ?? s.suggested_links,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      alert(result.error ?? "Erro ao criar memória.");
      return;
    }
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
          Cada aceite consolida uma memória no seu cérebro. Rejeitar não apaga: apenas ignora.
        </p>

        <div className="mt-12">
          {loading ? (
            <p className="py-12 text-center text-[13px]" style={{ color: c.dim }}>
              carregando…
            </p>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Image src="/mascot/yeti-reading.png" alt="Frostie esperando conteúdo" width={180} height={180} className="h-auto w-[160px]" />
              <p className="mt-4 text-center text-[14px]" style={{ color: c.dim }}>
                Nada por aqui. Volte depois de{" "}
                <Link href="/importar" className="underline underline-offset-4" style={{ color: c.accent }}>
                  importar mais um repo
                </Link>
                .
              </p>
            </div>
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
  const [conceptsText, setConceptsText] = useState(s.concepts.join(", "));
  const [linksText, setLinksText] = useState(
    suggestedLinks(s.suggested_links).map((link) => link.slug).join(", ")
  );

  const catLabel = useMemo(
    () => categories.find((cat) => cat.id === category)?.label ?? category,
    [categories, category]
  );
  const links = suggestedLinks(s.suggested_links);

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
            {typeof s.category_confidence === "number" && (
              <span style={{ color: c.aurora }}>
                {Math.round(s.category_confidence * 100)}% confiança
              </span>
            )}
          </div>
          {s.category_reason && (
            <p className="mt-2 text-[12px] leading-relaxed" style={{ color: c.dim }}>
              <span style={{ color: c.text }}>Por que esta área:</span> {s.category_reason}
            </p>
          )}
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
            onClick={() =>
              onAccept(
                editing
                  ? {
                      title,
                      body,
                      category,
                      concepts: conceptsText
                        .split(",")
                        .map((concept) => concept.trim())
                        .filter(Boolean),
                      suggested_links: linksText
                        .split(",")
                        .map((slug) => slug.trim())
                        .filter(Boolean)
                        .map((slug) => ({ slug })),
                    }
                  : undefined
              )
            }
            title="Aceitar"
            tone="accept"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
          </IconBtn>
        </div>
      </div>

      {editing && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: c.dim }}>
              conceitos · separados por vírgula
            </span>
            <input
              value={conceptsText}
              onChange={(e) => setConceptsText(e.target.value)}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-[12px] outline-none"
              style={{ color: c.text, borderColor: c.border }}
            />
          </label>
          <label className="space-y-1">
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: c.dim }}>
              associações · memórias separadas por vírgula
            </span>
            <input
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-[12px] outline-none"
              style={{ color: c.text, borderColor: c.border }}
            />
          </label>
        </div>
      )}

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

      {(s.concepts.length > 0 || links.length > 0) && (
        <div className="mt-5 space-y-3 border-t pt-4" style={{ borderColor: c.border }}>
          {s.concepts.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest" style={{ color: c.dim }}>
                conceitos sugeridos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {s.concepts.map((concept) => (
                  <span
                    key={concept}
                    className="rounded-full border px-2 py-1 font-mono text-[10px]"
                    style={{ borderColor: `${c.aurora}55`, background: `${c.aurora}12`, color: c.text }}
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}
          {links.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest" style={{ color: c.dim }}>
                <Link2 className="h-3 w-3" /> associações sugeridas
              </p>
              <div className="space-y-1.5">
                {links.map((link) => (
                  <div key={link.slug} className="flex items-start gap-2 text-[12px]" style={{ color: c.dim }}>
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.accent }} />
                    <span>
                      <span style={{ color: c.text }}>{link.slug}</span>
                      {link.reason ? ` — ${link.reason}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] italic" style={{ color: c.dim }}>
            Nada entra no cérebro até você aceitar esta sugestão.
          </p>
        </div>
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
