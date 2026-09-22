"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Note } from "@/lib/types";

interface Props {
  notes: Note[];
}

// timeZone fixo em UTC — mesma razão dos outros componentes.
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

type SortKey = "title" | "words" | "degree" | "updatedAt";
type SortDir = "asc" | "desc";
type LayerFilter = "all" | "core" | "growth";

export default function CamadasBrowser({ notes }: Props) {
  const [query, setQuery] = useState("");
  const [layerFilter, setLayerFilter] = useState<LayerFilter>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "title",
    dir: "asc",
  });

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) for (const t of n.tags) set.add(t);
    return [...set].sort();
  }, [notes]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const withDegree = notes
      .map((n) => ({ ...n, degree: n.links.length + n.backlinks.length }))
      .filter((n) => (layerFilter === "all" ? true : n.layer === layerFilter))
      .filter((n) => (tagFilter ? n.tags.includes(tagFilter) : true))
      .filter((n) => {
        if (!term) return true;
        return (
          n.title.toLowerCase().includes(term) ||
          n.slug.includes(term) ||
          n.tags.some((t) => t.toLowerCase().includes(term)) ||
          n.raw.toLowerCase().includes(term)
        );
      });

    const dir = sort.dir === "asc" ? 1 : -1;
    return withDegree.sort((a, b) => {
      if (sort.key === "title") return a.title.localeCompare(b.title, "pt-BR") * dir;
      if (sort.key === "updatedAt") return a.updatedAt.localeCompare(b.updatedAt) * dir;
      return ((a[sort.key] as number) - (b[sort.key] as number)) * dir;
    });
  }, [notes, query, layerFilter, tagFilter, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "title" ? "asc" : "desc" }
    );
  }

  function clearAll() {
    setQuery("");
    setLayerFilter("all");
    setTagFilter(null);
  }

  const hasFilter = query.trim() !== "" || layerFilter !== "all" || tagFilter !== null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-arctic">Camadas</h1>
          <p className="mt-1 text-sm text-mute">
            {notes.length} camadas no cofre. Filtre por layer, tag ou busque no corpo.
          </p>
        </div>

        <Card className="border-glow/15 bg-card/40">
          <CardContent className="space-y-4 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="buscar no título, tag, slug ou corpo"
                className="h-9 border-glow/15 bg-abyss/60 pl-9 font-mono text-xs text-arctic placeholder:text-mute/60 focus-visible:border-glow/50 focus-visible:ring-0"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-1 font-mono text-[10px] uppercase tracking-widest text-mute/80">
                layer
              </p>
              {(["all", "core", "growth"] as LayerFilter[]).map((v) => (
                <Chip
                  key={v}
                  active={layerFilter === v}
                  onClick={() => setLayerFilter(v)}
                  tone={v === "core" ? "glow" : v === "growth" ? "aurora" : undefined}
                >
                  {v === "all" ? "todos" : v}
                </Chip>
              ))}
            </div>

            {allTags.length > 0 && (
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-mute/80">
                  tag
                </p>
                {/* Scroll horizontal quando as tags não cabem — no telefone o wrap
                    empurra os filtros pra baixo demais. */}
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap md:overflow-visible">
                  <Chip active={tagFilter === null} onClick={() => setTagFilter(null)}>
                    todas
                  </Chip>
                  {allTags.map((tag) => (
                    <Chip
                      key={tag}
                      active={tagFilter === tag}
                      onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {hasFilter && (
              <div className="flex items-center justify-between border-t pt-3 hairline">
                <p className="font-mono text-[11px] text-mute">
                  {rows.length} de {notes.length}
                </p>
                <button
                  onClick={clearAll}
                  className="font-mono text-[11px] text-glow underline decoration-glow/40 underline-offset-2 transition-colors hover:decoration-glow"
                >
                  limpar filtros
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-glow/15 bg-card/40">
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-mute">
                Nada com esses filtros.{" "}
                <button
                  onClick={clearAll}
                  className="text-glow underline decoration-glow/40 underline-offset-2 hover:decoration-glow"
                >
                  Limpar
                </button>
                .
              </p>
            ) : (
              <>
                {/* Mobile: cards empilhados */}
                <ul className="divide-y hairline md:hidden">
                  {rows.map((row) => (
                    <li key={row.slug} className="p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              row.layer === "core" ? "bg-glow" : "bg-aurora"
                            )}
                          />
                          <Link
                            href={`/?camada=${row.slug}`}
                            className="truncate text-sm text-arctic/90 hover:underline"
                          >
                            {row.title}
                          </Link>
                        </div>
                        <span className="shrink-0 font-mono text-xs text-glow">{row.degree}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-mute">
                        <span>{row.words.toLocaleString("pt-BR")} palavras</span>
                        <span>· {formatDate(row.updatedAt)}</span>
                      </div>
                      {row.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {row.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => setTagFilter(tag)}
                              className="rounded-md border border-glow/15 bg-glow/5 px-1.5 py-0.5 font-mono text-[10px] text-mute transition-colors hover:border-glow/40 hover:text-arctic"
                              title={`filtrar por ${tag}`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Desktop: tabela com sort */}
                <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left font-mono text-[11px] uppercase tracking-widest text-mute hairline">
                      <Th label="Título" sortKey="title" sort={sort} onSort={toggleSort} />
                      <th className="px-4 py-3">Tags</th>
                      <Th
                        label="Palavras"
                        sortKey="words"
                        sort={sort}
                        onSort={toggleSort}
                        align="right"
                      />
                      <Th
                        label="Conexões"
                        sortKey="degree"
                        sort={sort}
                        onSort={toggleSort}
                        align="right"
                      />
                      <Th
                        label="Atualizado"
                        sortKey="updatedAt"
                        sort={sort}
                        onSort={toggleSort}
                        align="right"
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.slug}
                        className="border-b border-glow/8 text-[13px] text-arctic/85 transition-colors hover:bg-glow/[0.04]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                row.layer === "core" ? "bg-glow" : "bg-aurora"
                              )}
                            />
                            <Link
                              href={`/?camada=${row.slug}`}
                              className="hover:text-arctic hover:underline"
                            >
                              {row.title}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {row.tags.length === 0 ? (
                            <span className="text-mute/60">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {row.tags.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => setTagFilter(tag)}
                                  className="rounded-md border border-glow/15 bg-glow/5 px-1.5 py-0.5 font-mono text-[10px] text-mute transition-colors hover:border-glow/40 hover:text-arctic"
                                  title={`filtrar por ${tag}`}
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-mute">
                          {row.words.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-mute">
                          {row.degree}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-mute">
                          {formatDate(row.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone?: "glow" | "aurora";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
        active
          ? tone === "aurora"
            ? "border-aurora/40 bg-aurora/10 text-aurora"
            : tone === "glow"
              ? "border-glow/50 bg-glow/10 text-arctic"
              : "border-glow/40 bg-glow/10 text-arctic"
          : "border-glow/15 bg-abyss/40 text-mute hover:border-glow/30 hover:text-arctic"
      )}
    >
      {children}
    </button>
  );
}

function Th({
  label,
  sortKey,
  sort,
  onSort,
  align,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
  align?: "right";
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("px-4 py-3", align === "right" && "text-right")}>
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1.5 uppercase tracking-widest transition-colors",
          active ? "text-arctic" : "hover:text-arctic"
        )}
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}
