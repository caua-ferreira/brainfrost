"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
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
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      <nav className="order-2 flex max-h-[42%] shrink-0 flex-col border-t bg-card/40 hairline md:order-1 md:max-h-none md:w-64 md:border-r md:border-t-0">
        <div className="space-y-3 border-b p-3 hairline">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="buscar camada"
            className="h-8 border-glow/15 bg-abyss/60 font-mono text-xs text-arctic placeholder:text-mute/60 focus-visible:border-glow/50 focus-visible:ring-0"
          />
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-mute">
            <Stat value={stats.notes} label="camadas" />
            <Stat value={stats.edges} label="conexões" />
            <Stat value={stats.words.toLocaleString("pt-BR")} label="palavras" />
            {stats.orphans > 0 && <Stat value={stats.orphans} label="sem conexão" tone="aurora" />}
            <span className="ml-auto whitespace-nowrap text-mute/70">atualizado em {updated}</span>
          </dl>
        </div>

        <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {matches.map((item) => {
            const active = item.slug === selected;
            return (
              <li key={item.slug}>
                <button
                  onClick={() => setSelected(item.slug)}
                  className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                    active
                      ? "bg-glow/12 text-arctic"
                      : "text-arctic/70 hover:bg-glow/5 hover:text-arctic"
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
