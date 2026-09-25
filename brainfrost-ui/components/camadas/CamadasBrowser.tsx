"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Search, Trash2, X } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { getSupabase } from "@/lib/supabase/client";
import { useCategories } from "@/lib/supabase/hooks";
import type { Note } from "@/lib/types";

interface Props {
  notes: Note[];
  refresh: () => Promise<void>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function CamadasBrowser({ notes, refresh }: Props) {
  const theme = useSaas((s) => s.theme);
  const c = palette(theme);
  const categories = useCategories();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return notes
      .filter((n) => (categoryFilter ? n.category === categoryFilter : true))
      .filter((n) => {
        if (!term) return true;
        return (
          n.title.toLowerCase().includes(term) ||
          n.slug.includes(term) ||
          n.raw.toLowerCase().includes(term)
        );
      });
  }, [notes, query, categoryFilter]);

  const catLabel = (id?: string) =>
    categories.find((c) => c.id === id)?.label ?? id ?? "—";

  return (
    <div
      className="relative h-full overflow-y-auto overflow-x-hidden"
      style={{ background: c.bg }}
    >
      <div
        className="pointer-events-none absolute -right-32 top-0 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: c.accent, opacity: 0.10 }}
      />
      <div
        className="pointer-events-none absolute -left-32 top-72 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: c.aurora, opacity: 0.07 }}
      />

      <div className="relative mx-auto max-w-5xl px-6 py-16 md:py-20">
        <h1
          className="text-[42px] font-semibold leading-[1.02] tracking-tight md:text-[56px]"
          style={{ color: c.text }}
        >
          {notes.length} camadas
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(to right, ${c.accent}, ${c.aurora})` }}
          >
            do seu cofre.
          </span>
        </h1>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed" style={{ color: c.dim }}>
          Clique numa camada pra editar título, corpo ou categoria. Corrija manualmente o que
          o LLM classificou errado — não precisa reprocessar.
        </p>

        {/* Filtros */}
        <div className="mt-12 flex flex-col gap-4 border-t pt-8" style={{ borderColor: c.borderSoft }}>
          <div
            className="flex items-center gap-2 rounded-xl border px-3"
            style={{ background: c.bgSoft, borderColor: c.borderSoft }}
          >
            <Search className="h-4 w-4" strokeWidth={2} style={{ color: c.dim }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="buscar por título, slug ou conteúdo…"
              className="h-11 flex-1 bg-transparent text-[13px] outline-none placeholder:opacity-50"
              style={{ color: c.text }}
            />
            <span className="font-mono text-[11px]" style={{ color: c.dim }}>
              {filtered.length}/{notes.length}
            </span>
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <CategoryChip
                c={c}
                active={categoryFilter === null}
                onClick={() => setCategoryFilter(null)}
              >
                Todas
              </CategoryChip>
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  c={c}
                  active={categoryFilter === cat.id}
                  onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
                >
                  {cat.label}
                </CategoryChip>
              ))}
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="mt-8 space-y-3">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-[14px]" style={{ color: c.dim }}>
              Nada aqui.
              {categoryFilter && (
                <>
                  {" "}Escolha outra categoria ou{" "}
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className="underline underline-offset-4"
                    style={{ color: c.accent }}
                  >
                    limpe o filtro
                  </button>
                  .
                </>
              )}
            </p>
          ) : (
            filtered.map((n) =>
              editingId === n.id && n.id ? (
                <EditRow
                  key={n.id}
                  c={c}
                  note={n}
                  categories={categories}
                  onCancel={() => setEditingId(null)}
                  onSaved={async () => {
                    setEditingId(null);
                    await refresh();
                  }}
                />
              ) : (
                <NoteRow
                  key={n.slug}
                  c={c}
                  note={n}
                  categoryLabel={catLabel(n.category)}
                  onEdit={() => n.id && setEditingId(n.id)}
                />
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryChip({
  c,
  active,
  onClick,
  children,
}: {
  c: ReturnType<typeof palette>;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest transition-colors"
      style={{
        background: active ? `${c.accent}18` : "transparent",
        borderColor: active ? c.accent : c.borderSoft,
        color: active ? c.accent : c.dim,
      }}
    >
      {children}
    </button>
  );
}

function NoteRow({
  c,
  note,
  categoryLabel,
  onEdit,
}: {
  c: ReturnType<typeof palette>;
  note: Note;
  categoryLabel: string;
  onEdit: () => void;
}) {
  const degree = note.links.length + note.backlinks.length;
  return (
    <article
      className="group rounded-2xl border p-5 transition-colors"
      style={{ background: c.card, borderColor: c.border }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold leading-snug" style={{ color: c.text }}>
            {note.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <span
              className="rounded-full px-2 py-0.5"
              style={{ background: `${c.accent}18`, color: c.accent }}
            >
              {categoryLabel}
            </span>
            <span style={{ color: c.dim }}>{formatDate(note.updatedAt)}</span>
            <span style={{ color: c.dim }}>{note.words.toLocaleString("pt-BR")} palavras</span>
            <span style={{ color: c.dim }}>
              {degree} {degree === 1 ? "conexão" : "conexões"}
            </span>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100"
          title="Editar camada"
          style={{ background: `${c.dim}18`, color: c.dim }}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </div>
      {note.excerpt && (
        <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed" style={{ color: c.dim }}>
          {note.excerpt}
        </p>
      )}
    </article>
  );
}

function EditRow({
  c,
  note,
  categories,
  onCancel,
  onSaved,
}: {
  c: ReturnType<typeof palette>;
  note: Note;
  categories: { id: string; label: string }[];
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.raw);
  const [category, setCategory] = useState(note.category ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!note.id) return;
    setBusy(true);
    const { error } = await getSupabase()
      .from("vault_notes")
      .update({ title, body, category })
      .eq("id", note.id);
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    await onSaved();
  };

  const remove = async () => {
    if (!note.id) return;
    if (!confirm(`Remover "${note.title}"? A camada será apagada e não pode ser desfeita.`)) return;
    setBusy(true);
    await getSupabase().from("vault_notes").delete().eq("id", note.id);
    setBusy(false);
    await onSaved();
  };

  return (
    <article
      className="rounded-2xl border-2 p-5"
      style={{ background: c.card, borderColor: c.accent }}
    >
      <div className="space-y-4">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
            Título
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-lg border bg-transparent px-3 py-2 text-[15px] font-medium outline-none focus:ring-2"
            style={{ color: c.text, borderColor: c.borderSoft, background: c.bgSoft }}
          />
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
            Categoria
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2 text-[13px] outline-none focus:ring-2"
            style={{ color: c.text, borderColor: c.borderSoft, background: c.bgSoft }}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} style={{ background: c.card, color: c.text }}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
            Corpo
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-2 w-full resize-y rounded-lg border p-3 font-mono text-[12px] leading-relaxed outline-none focus:ring-2"
            style={{
              minHeight: 220,
              color: c.text,
              borderColor: c.borderSoft,
              background: c.bgSoft,
            }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t pt-4" style={{ borderColor: c.borderSoft }}>
        <button
          onClick={remove}
          disabled={busy}
          className="flex items-center gap-2 text-[12px] font-medium hover:brightness-125 disabled:opacity-40"
          style={{ color: "#ff6b81" }}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          Remover camada
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-medium disabled:opacity-40"
            style={{ borderColor: c.border, color: c.text }}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={busy || title.trim().length < 3}
            className="flex items-center gap-1.5 rounded-full px-5 py-2 text-[12px] font-medium disabled:opacity-40"
            style={{ background: c.accent, color: c.onAccent }}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
            {busy ? "…" : "Salvar"}
          </button>
        </div>
      </div>
    </article>
  );
}
