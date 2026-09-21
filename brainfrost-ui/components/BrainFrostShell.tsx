"use client";

import { useEffect, useMemo, useState } from "react";
import GraphCanvas from "./GraphCanvas";
import ReaderPanel from "./ReaderPanel";
import type { VaultSnapshot } from "@/lib/types";

export default function BrainFrostShell({ snapshot }: { snapshot: VaultSnapshot }) {
  const { notes, graph, stats } = snapshot;
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const note = useMemo(() => notes.find((n) => n.slug === selected) ?? null, [notes, selected]);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(term) ||
        n.slug.includes(term) ||
        n.tags.some((tag) => tag.toLowerCase().includes(term)) ||
        n.excerpt.toLowerCase().includes(term)
    );
  }, [notes, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // timeZone fixo em UTC porque o server (iad1) e o cliente (fuso do leitor)
  // podem cair em dias diferentes e travar a hidratação do React.
  const updated = new Date(stats.lastUpdate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-b px-4 py-3 hairline md:px-6">
        <div className="flex items-baseline gap-2.5">
          <span aria-hidden className="text-glow">
            ❄
          </span>
          <h1 className="text-[17px] font-semibold tracking-tight">BrainFrost</h1>
          <span className="hidden font-mono text-[11px] text-mute sm:inline">
            atualizado em {updated}
          </span>
        </div>

        <dl className="flex items-center gap-5 font-mono text-[11px] text-mute">
          <Stat value={stats.notes} label="camadas" />
          <Stat value={stats.edges} label="conexões" />
          <Stat value={stats.words.toLocaleString("pt-BR")} label="palavras" />
          {stats.orphans > 0 && <Stat value={stats.orphans} label="sem conexão" tone="aurora" />}
        </dl>

        <label className="ml-auto w-full sm:w-64">
          <span className="sr-only">Buscar camada</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="buscar camada"
            className="w-full rounded-lg border border-glow/15 bg-deep/60 px-3 py-1.5 font-mono text-xs text-arctic placeholder:text-mute/60 focus:border-glow/50 focus:outline-none"
          />
        </label>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <nav className="order-2 max-h-[38%] shrink-0 overflow-y-auto border-t px-4 py-3 hairline md:order-1 md:max-h-none md:w-60 md:border-r md:border-t-0 md:py-4">
          <ul className="space-y-0.5">
            {matches.map((item) => {
              const active = item.slug === selected;
              return (
                <li key={item.slug}>
                  <button
                    onClick={() => setSelected(item.slug)}
                    className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                      active ? "bg-glow/12 text-arctic" : "text-arctic/70 hover:bg-glow/5 hover:text-arctic"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        item.layer === "core" ? "bg-glow" : "bg-aurora"
                      } ${active ? "" : "opacity-60"}`}
                    />
                    <span className="truncate">{item.title}</span>
                    <span className="ml-auto font-mono text-[10px] text-mute">
                      {item.links.length + item.backlinks.length}
                    </span>
                  </button>
                </li>
              );
            })}
            {matches.length === 0 && (
              <li className="px-2 py-3 text-[13px] leading-relaxed text-mute">
                Nada com esse termo. Grave uma camada nova com{" "}
                <code className="font-mono text-arctic">bfrost learn</code>.
              </li>
            )}
          </ul>
        </nav>

        <main className="order-1 min-h-0 flex-1 md:order-2">
          <GraphCanvas data={graph} selected={selected} onSelect={setSelected} />
        </main>

        {note && (
          <div className="absolute inset-x-0 bottom-0 top-auto z-20 h-[72%] md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[440px]">
            <ReaderPanel
              note={note}
              notes={notes}
              onNavigate={setSelected}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string | number; label: string; tone?: "aurora" }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="sr-only">{label}</dt>
      <dd className={tone === "aurora" ? "text-aurora" : "text-arctic"}>{value}</dd>
      <span>{label}</span>
    </div>
  );
}
