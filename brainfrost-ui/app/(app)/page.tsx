"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import BrainFrostShell from "@/components/BrainFrostShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { getSupabase } from "@/lib/supabase/client";
import type { Note, VaultSnapshot } from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";

type NoteRow = Database["public"]["Tables"]["vault_notes"]["Row"];
type LinkRow = Database["public"]["Tables"]["vault_links"]["Row"];

function buildSnapshot(noteRows: NoteRow[], linkRows: LinkRow[]): VaultSnapshot {
  const bySlug = new Map(noteRows.map((n) => [n.slug, n]));
  const idToSlug = new Map(noteRows.map((n) => [n.id, n.slug]));

  const linksBySource: Record<string, string[]> = {};
  for (const row of linkRows) {
    const sourceSlug = idToSlug.get(row.from_note_id);
    if (!sourceSlug) continue;
    (linksBySource[sourceSlug] ??= []).push(row.to_slug);
  }

  const notes: Note[] = noteRows.map((n) => {
    const outgoing = linksBySource[n.slug] ?? [];
    const links = outgoing.filter((slug) => bySlug.has(slug));
    const broken = outgoing.filter((slug) => !bySlug.has(slug));
    const body = n.body.trim();
    const words = body.length ? body.split(/\s+/).length : 0;
    return {
      slug: n.slug,
      file: `${n.slug}.md`,
      title: n.title,
      tags: Array.isArray(n.tags) ? n.tags : [],
      layer: (n.layer === "core" ? "core" : "growth") as "core" | "growth",
      content: body,
      raw: body,
      excerpt: body.slice(0, 240),
      links,
      backlinks: [],
      broken,
      updatedAt: n.updated_at,
      words,
    };
  });

  for (const note of notes) {
    note.backlinks = notes
      .filter((n) => n.links.includes(note.slug))
      .map((n) => n.slug);
  }

  const graphNodes = notes.map((n) => ({
    id: n.slug,
    title: n.title,
    layer: n.layer,
    degree: n.links.length + n.backlinks.length,
    words: n.words,
    updatedAt: n.updatedAt,
  }));
  const graphLinks: { source: string; target: string }[] = [];
  const seen = new Set<string>();
  for (const note of notes) {
    for (const target of note.links) {
      const key = [note.slug, target].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);
      graphLinks.push({ source: note.slug, target });
    }
  }

  const orphans = notes.filter((n) => n.links.length === 0 && n.backlinks.length === 0).length;
  const words = notes.reduce((sum, n) => sum + n.words, 0);
  const lastUpdate =
    notes.length > 0
      ? notes.map((n) => n.updatedAt).sort().at(-1) ?? new Date(0).toISOString()
      : new Date(0).toISOString();
  const broken = notes.flatMap((n) => n.broken.map((b) => `${n.slug} → ${b}`));

  return {
    dir: "supabase://vault_notes",
    notes,
    graph: { nodes: graphNodes, links: graphLinks },
    stats: {
      notes: notes.length,
      edges: graphLinks.length,
      words,
      orphans,
      broken,
      lastUpdate,
    },
  };
}

export default function Page() {
  const [snapshot, setSnapshot] = useState<VaultSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabase();
      const [notesRes, linksRes] = await Promise.all([
        supabase.from("vault_notes").select("*").order("updated_at", { ascending: false }),
        supabase.from("vault_links").select("*"),
      ]);
      if (notesRes.error) {
        setError(notesRes.error.message);
        setLoading(false);
        return;
      }
      setSnapshot(buildSnapshot(notesRes.data ?? [], linksRes.data ?? []));
      setLoading(false);
    };
    load();
  }, []);

  const emptyMemo = useMemo(
    () => snapshot && snapshot.notes.length === 0,
    [snapshot]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-abyss">
        <div className="font-mono text-xs uppercase tracking-widest text-mute">
          carregando cofre…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full overflow-auto p-6">
        <EmptyState
          title="Não deu para ler o cofre"
          description="Sua sessão pode ter expirado ou o Supabase está indisponível."
          action={
            <pre className="max-w-2xl overflow-x-auto rounded-lg border border-glow/15 bg-abyss/80 p-4 text-left font-mono text-xs leading-relaxed text-mute">
              {error}
            </pre>
          }
        />
      </div>
    );
  }

  if (emptyMemo) {
    return (
      <div className="h-full overflow-auto p-6">
        <EmptyState
          title="Cofre vazio"
          description="Sobe um repositório em /importar e aceita as sugestões em /curadoria pra começar a preencher o cofre e ver o grafo."
        />
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <BrainFrostShell snapshot={snapshot!} />
    </Suspense>
  );
}
