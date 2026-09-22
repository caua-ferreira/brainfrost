"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Note, VaultStats } from "@/lib/types";

interface Props {
  notes: Note[];
  stats: VaultStats;
}

// timeZone fixo em UTC — mesma razão do BrainFrostShell/ReaderPanel.
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

// Estimativa GPT-ish: cerca de 1.33 tokens por palavra em português.
// O CLI usa uma heurística parecida — importa que os dois números conversem.
function tokenize(words: number) {
  return Math.round(words * 1.33);
}

type SortKey = "title" | "words" | "degree" | "updatedAt";
type SortDir = "asc" | "desc";

export default function CofreDashboard({ notes, stats }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "degree",
    dir: "desc",
  });

  const totalTokens = tokenize(stats.words);
  const brokenCount = stats.broken.length;

  const chartData = useMemo(
    () =>
      notes
        .map((n) => ({
          slug: n.slug,
          name: n.title,
          layer: n.layer,
          degree: n.links.length + n.backlinks.length,
        }))
        .sort((a, b) => b.degree - a.degree),
    [notes]
  );

  const rows = useMemo(() => {
    const withDegree = notes.map((n) => ({
      ...n,
      degree: n.links.length + n.backlinks.length,
    }));
    const dir = sort.dir === "asc" ? 1 : -1;
    return withDegree.sort((a, b) => {
      if (sort.key === "title") return a.title.localeCompare(b.title, "pt-BR") * dir;
      if (sort.key === "updatedAt") return a.updatedAt.localeCompare(b.updatedAt) * dir;
      return ((a[sort.key] as number) - (b[sort.key] as number)) * dir;
    });
  }, [notes, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "title" ? "asc" : "desc" }
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-arctic">Cofre</h1>
          <p className="mt-1 text-sm text-mute">
            Saúde do <code className="font-mono text-arctic">.brainfrost/</code> — o que existe,
            o que está solto, o que aponta pra lugar nenhum.
          </p>
        </div>

        {brokenCount > 0 && (
          <div className="flex items-start gap-3 rounded-lg border border-aurora/40 bg-aurora/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-aurora" />
            <div className="text-sm">
              <p className="font-medium text-aurora">
                {brokenCount} {brokenCount === 1 ? "link aponta" : "links apontam"} para camada
                inexistente
              </p>
              <p className="mt-1 font-mono text-[12px] text-arctic/80">
                {stats.broken.slice(0, 6).join(" · ")}
                {stats.broken.length > 6 && ` … +${stats.broken.length - 6}`}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="camadas" value={stats.notes} />
          <StatCard label="conexões" value={stats.edges} />
          <StatCard label="palavras" value={stats.words.toLocaleString("pt-BR")} />
          <StatCard label="tokens (est.)" value={totalTokens.toLocaleString("pt-BR")} />
          <StatCard label="sem conexão" value={stats.orphans} tone={stats.orphans > 0 ? "aurora" : undefined} />
          <StatCard label="links quebrados" value={brokenCount} tone={brokenCount > 0 ? "aurora" : undefined} />
        </div>

        <Card className="border-glow/15 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-arctic">Conexões por camada</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-56 w-full sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 24, left: -20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#7E9BB8", fontSize: 10, fontFamily: "var(--font-plex-mono)" }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="rgba(90, 216, 255, 0.15)"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "#7E9BB8", fontSize: 11, fontFamily: "var(--font-plex-mono)" }}
                    stroke="rgba(90, 216, 255, 0.15)"
                  />
                  <ChartTooltip
                    cursor={{ fill: "rgba(90, 216, 255, 0.06)" }}
                    contentStyle={{
                      background: "rgba(10, 26, 47, 0.95)",
                      border: "1px solid rgba(90, 216, 255, 0.25)",
                      borderRadius: 8,
                      color: "#E9F6FF",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#5AD8FF", fontFamily: "var(--font-plex-mono)" }}
                  />
                  <Bar dataKey="degree" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.slug} fill={entry.layer === "core" ? "#5AD8FF" : "#9BFFE4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-glow/15 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-arctic">Camadas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile: cards empilhados. Tabela larga estraga a leitura no telefone. */}
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
                    {row.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {row.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="border-glow/15 bg-glow/5 font-mono text-[10px] text-mute"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop: tabela clássica com sort */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left font-mono text-[11px] uppercase tracking-widest text-mute hairline">
                    <Th label="Título" sortKey="title" sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3">Tags</th>
                    <Th label="Palavras" sortKey="words" sort={sort} onSort={toggleSort} align="right" />
                    <Th label="Conexões" sortKey="degree" sort={sort} onSort={toggleSort} align="right" />
                    <Th label="Atualizado" sortKey="updatedAt" sort={sort} onSort={toggleSort} align="right" />
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
                              <Badge
                                key={tag}
                                variant="outline"
                                className="border-glow/15 bg-glow/5 font-mono text-[10px] text-mute"
                              >
                                {tag}
                              </Badge>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "aurora";
}) {
  return (
    <Card className="border-glow/15 bg-card/50">
      <CardContent className="space-y-1 p-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-mute/80">{label}</p>
        <p
          className={cn(
            "font-mono text-lg font-medium tabular-nums",
            tone === "aurora" ? "text-aurora" : "text-arctic"
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
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
