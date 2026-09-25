"use client";

import { useMemo } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { useCategories } from "@/lib/supabase/hooks";
import type { Note, VaultStats } from "@/lib/types";

interface Props {
  notes: Note[];
  stats: VaultStats;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function tokenize(words: number) {
  return Math.round(words * 1.33);
}

export default function CofreDashboard({ notes, stats }: Props) {
  const theme = useSaas((s) => s.theme);
  const c = palette(theme);
  const categories = useCategories();

  const totalTokens = tokenize(stats.words);
  const brokenCount = stats.broken.length;

  const perCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of notes) {
      const cat = n.category ?? "sem categoria";
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([id, count]) => ({
      id,
      label: categories.find((c) => c.id === id)?.label ?? id,
      count,
    }));
  }, [notes, categories]);

  const chartData = useMemo(
    () =>
      notes
        .map((n) => ({
          slug: n.slug,
          name: n.title,
          layer: n.layer,
          degree: n.links.length + n.backlinks.length,
        }))
        .sort((a, b) => b.degree - a.degree)
        .slice(0, 12),
    [notes]
  );

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
          A saúde do
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(to right, ${c.accent}, ${c.aurora})` }}
          >
            seu cofre.
          </span>
        </h1>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed" style={{ color: c.dim }}>
          O que existe, o que está solto, o que aponta pra lugar nenhum. Use como termômetro
          antes de deixar o cofre alimentar a IA que você trabalha.
        </p>

        {brokenCount > 0 && (
          <div
            className="mt-10 flex items-start gap-3 rounded-2xl border p-4"
            style={{ borderColor: c.aurora, background: `${c.aurora}12` }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} style={{ color: c.aurora }} />
            <div>
              <p className="text-[13px] font-medium" style={{ color: c.text }}>
                {brokenCount} {brokenCount === 1 ? "link aponta" : "links apontam"} para camada inexistente
              </p>
              <p className="mt-1 font-mono text-[11px]" style={{ color: c.dim }}>
                {stats.broken.slice(0, 6).join(" · ")}
                {stats.broken.length > 6 && ` … +${stats.broken.length - 6}`}
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div
          className="mt-12 grid grid-cols-2 gap-6 border-t pt-8 md:grid-cols-3 lg:grid-cols-6"
          style={{ borderColor: c.borderSoft }}
        >
          <Stat c={c} label="camadas" value={stats.notes} />
          <Stat c={c} label="conexões" value={stats.edges} />
          <Stat c={c} label="palavras" value={stats.words.toLocaleString("pt-BR")} />
          <Stat c={c} label="tokens (est.)" value={totalTokens.toLocaleString("pt-BR")} />
          <Stat c={c} label="sem conexão" value={stats.orphans} tone={stats.orphans > 0 ? "aurora" : undefined} />
          <Stat c={c} label="links quebrados" value={brokenCount} tone={brokenCount > 0 ? "aurora" : undefined} />
        </div>

        {/* Categorias */}
        {perCategory.length > 0 && (
          <div className="mt-12 border-t pt-8" style={{ borderColor: c.borderSoft }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
              Camadas por categoria
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {perCategory.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest"
                  style={{ borderColor: c.borderSoft, color: c.dim }}
                >
                  <span style={{ color: c.text }}>{cat.count}</span> {cat.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div
            className="mt-12 rounded-2xl border p-5"
            style={{ background: c.card, borderColor: c.border }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" strokeWidth={2} style={{ color: c.accent }} />
              <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
                Top {chartData.length} camadas por conexão
              </p>
            </div>
            <div className="mt-4 h-56 w-full sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 24, left: -20 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: c.dim, fontSize: 10, fontFamily: "var(--font-plex-mono)" }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke={c.borderSoft}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: c.dim, fontSize: 11, fontFamily: "var(--font-plex-mono)" }}
                    stroke={c.borderSoft}
                  />
                  <ChartTooltip
                    cursor={{ fill: `${c.accent}10` }}
                    contentStyle={{
                      background: c.card,
                      border: `1px solid ${c.border}`,
                      borderRadius: 8,
                      color: c.text,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: c.accent, fontFamily: "var(--font-plex-mono)" }}
                  />
                  <Bar dataKey="degree" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.slug} fill={entry.layer === "core" ? c.accent : c.aurora} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Últimas atualizações */}
        <div className="mt-12 border-t pt-8" style={{ borderColor: c.borderSoft }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>
            Últimas atualizações
          </p>
          <div className="mt-4 divide-y" style={{ borderColor: c.borderSoft }}>
            {notes.slice(0, 10).map((n) => (
              <div key={n.slug} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium" style={{ color: c.text }}>
                    {n.title}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px]" style={{ color: c.dim }}>
                    {n.words.toLocaleString("pt-BR")} palavras · {n.links.length + n.backlinks.length} conexões · {formatDate(n.updatedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  c,
  label,
  value,
  tone,
}: {
  c: ReturnType<typeof palette>;
  label: string;
  value: string | number;
  tone?: "aurora";
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: c.dim }}>
        {label}
      </p>
      <p
        className="font-mono text-[24px] leading-none tabular-nums"
        style={{ color: tone === "aurora" ? c.aurora : c.text }}
      >
        {value}
      </p>
    </div>
  );
}
