"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Boxes, List, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import GraphCanvas from "./GraphCanvas";
import ReaderPanel from "./ReaderPanel";
import GroupPanel from "./GroupPanel";
import type { VaultSnapshot } from "@/lib/types";
import { buildGroupGraph, buildNoteGroups, groupKey, type NoteGroup } from "@/lib/graph-groups";

export default function BrainFrostShell({ snapshot }: { snapshot: VaultSnapshot }) {
  const { notes, graph, stats } = snapshot;
  const groups = useMemo(() => buildNoteGroups(notes, graph), [notes, graph]);
  const groupGraph = useMemo(() => buildGroupGraph(groups, graph), [groups, graph]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialSlug = searchParams.get("camada");
  const initialView: "groups" | "notes" =
    searchParams.get("visao") === "camadas" ? "notes" : initialSlug ? "notes" : "groups";
  const initialValid = initialSlug && notes.some((n) => n.slug === initialSlug) ? initialSlug : null;
  const initialGroup = initialValid
    ? groups.find((group) => group.key === groupKey(notes.find((note) => note.slug === initialValid)!))?.id ?? null
    : null;
  const [view, setView] = useState<"groups" | "notes">(initialView);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialGroup);
  const [selectedNoteSlug, setSelectedNoteSlug] = useState<string | null>(initialValid);
  const [query, setQuery] = useState("");

  // Sincroniza a URL: aberta com camada = ?camada=<slug>; fechada = URL limpa.
  // O `scroll: false` evita jump quando o painel abre em cima do grafo.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = selectedNoteSlug ? `${pathname}?camada=${selectedNoteSlug}` : pathname;
    const current = window.location.pathname + window.location.search;
    if (target !== current) router.replace(target, { scroll: false });
  }, [selectedNoteSlug, pathname, router]);

  const note = useMemo(() => notes.find((n) => n.slug === selectedNoteSlug) ?? null, [notes, selectedNoteSlug]);
  const selectedGroup = useMemo<NoteGroup | null>(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const noteMatches = useMemo(() => {
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

  const groupMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter(
      (group) =>
        group.title.toLowerCase().includes(term) ||
        group.key.includes(term) ||
        group.notes.some((item) => item.title.toLowerCase().includes(term))
    );
  }, [groups, query]);

  const openGroup = (id: string) => {
    setView("groups");
    setSelectedGroupId(id);
    setSelectedNoteSlug(null);
  };

  const openNote = (slug: string) => {
    const nextGroup = groups.find((group) => group.notes.some((item) => item.slug === slug));
    setView("notes");
    setSelectedGroupId(nextGroup?.id ?? null);
    setSelectedNoteSlug(slug);
  };

  const selectGraphItem = (id: string | null) => {
    if (!id) {
      setSelectedGroupId(null);
      setSelectedNoteSlug(null);
      return;
    }
    if (view === "groups") setSelectedGroupId(id);
    else setSelectedNoteSlug(id);
  };

  const switchView = (nextView: "groups" | "notes") => {
    setView(nextView);
    if (nextView === "groups") setSelectedNoteSlug(null);
    else setSelectedGroupId(null);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedGroupId(null);
        setSelectedNoteSlug(null);
      }
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
      {/* No mobile a lista lateral some — o grafo ganha a tela inteira e o
          ⌘K/Header ou a paleta ficam com a busca. */}
      <nav className="order-2 hidden max-h-[42%] shrink-0 flex-col border-t bg-card/40 hairline md:order-1 md:flex md:max-h-none md:w-64 md:border-r md:border-t-0">
        <div className="space-y-3 border-b p-3 hairline">
          <div className="flex items-center gap-1 rounded-md bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => switchView("groups")}
              aria-pressed={view === "groups"}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[11px] transition-colors ${view === "groups" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Boxes className="h-3.5 w-3.5" />
              Áreas
            </button>
            <button
              type="button"
              onClick={() => switchView("notes")}
              aria-pressed={view === "notes"}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[11px] transition-colors ${view === "notes" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-3.5 w-3.5" />
              Memórias
            </button>
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={view === "groups" ? "buscar área" : "buscar memória"}
            className="h-8 border-primary/15 bg-background/70 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary/50 focus-visible:ring-0"
          />
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <Stat value={view === "groups" ? groups.length : stats.notes} label={view === "groups" ? "áreas" : "memórias"} />
            {view === "groups" && <Stat value={stats.notes} label="memórias" />}
            <Stat value={stats.edges} label="associações" />
            <Stat value={stats.words.toLocaleString("pt-BR")} label="palavras" />
            {stats.orphans > 0 && <Stat value={stats.orphans} label="isoladas" tone="aurora" />}
            <span className="ml-auto whitespace-nowrap text-mute/70">atualizado em {updated}</span>
          </dl>
        </div>

        <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {view === "groups" ? groupMatches.map((group) => {
            const active = group.id === selectedGroupId;
            return (
              <li key={group.id}>
                <button
                  type="button"
                  onClick={() => openGroup(group.id)}
                  className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[13px] transition-colors ${active ? "bg-primary/10 text-foreground" : "text-foreground/70 hover:bg-primary/5 hover:text-foreground"}`}
                >
                  <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full bg-primary ${active ? "" : "opacity-60"}`} />
                  <span className="min-w-0 flex-1 truncate">{group.title}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{group.notes.length}</span>
                </button>
              </li>
            );
          }) : noteMatches.map((item) => {
            const active = item.slug === selectedNoteSlug;
            return (
              <li key={item.slug}>
                <button
                  type="button"
                  onClick={() => openNote(item.slug)}
                  className={`group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${active ? "bg-primary/10 text-foreground" : "text-foreground/70 hover:bg-primary/5 hover:text-foreground"}`}
                >
                  <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.layer === "core" ? "bg-primary" : "bg-accent"} ${active ? "" : "opacity-60"}`} />
                  <span className="truncate">{item.title}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{item.links.length + item.backlinks.length}</span>
                </button>
              </li>
            );
          })}
          {(view === "groups" ? groupMatches.length : noteMatches.length) === 0 && (
            <li className="px-2 py-3 text-[13px] leading-relaxed text-muted-foreground">
              Nada com esse termo.
            </li>
          )}
        </ul>
      </nav>

      <main className="relative order-1 min-h-0 flex-1 md:order-2">
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-1 rounded-lg border border-border bg-card/85 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => switchView("groups")}
            aria-pressed={view === "groups"}
            className={`pointer-events-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${view === "groups" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Boxes className="h-3.5 w-3.5" />
            Áreas
          </button>
          <button
            type="button"
            onClick={() => switchView("notes")}
            aria-pressed={view === "notes"}
            className={`pointer-events-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${view === "notes" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-3.5 w-3.5" />
            Memórias
          </button>
          <Link
            href="/camadas"
            className="pointer-events-auto ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            title="Editar memórias manualmente"
          >
            <Pencil className="h-3.5 w-3.5" />
            editar
          </Link>
        </div>
        <GraphCanvas
          data={view === "groups" ? groupGraph : graph}
          selected={view === "groups" ? selectedGroupId : selectedNoteSlug}
          onSelect={selectGraphItem}
        />
      </main>

      <GroupPanel group={view === "groups" ? selectedGroup : null} onSelectNote={openNote} onClose={() => setSelectedGroupId(null)} />
      {/* Sheet cuida do posicionamento e do overlay — o painel abre quando `note` existe. */}
      <ReaderPanel
        note={note}
        notes={notes}
        onNavigate={openNote}
        onClose={() => setSelectedNoteSlug(null)}
      />
    </div>
  );
}

function Stat({ value, label, tone }: { value: string | number; label: string; tone?: "aurora" }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="sr-only">{label}</dt>
      <dd className={tone === "aurora" ? "text-accent" : "text-foreground"}>{value}</dd>
      <span>{label}</span>
    </div>
  );
}
