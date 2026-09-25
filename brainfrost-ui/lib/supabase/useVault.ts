"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "./client";
import type { Note, VaultSnapshot } from "@/lib/types";
import type { Database } from "./database.types";

type NoteRow = Database["public"]["Tables"]["vault_notes"]["Row"];
type LinkRow = Database["public"]["Tables"]["vault_links"]["Row"];

export function buildSnapshot(noteRows: NoteRow[], linkRows: LinkRow[]): VaultSnapshot {
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
      id: n.id,
      slug: n.slug,
      file: `${n.slug}.md`,
      title: n.title,
      tags: Array.isArray(n.tags) ? n.tags : [],
      layer: (n.layer === "core" ? "core" : "growth") as "core" | "growth",
      category: n.category,
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
    note.backlinks = notes.filter((n) => n.links.includes(note.slug)).map((n) => n.slug);
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

interface VaultState {
  snapshot: VaultSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useVaultSnapshot(): VaultState {
  const [snapshot, setSnapshot] = useState<VaultSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const supabase = getSupabase();
    const [notesRes, linksRes] = await Promise.all([
      supabase.from("vault_notes").select("*").order("updated_at", { ascending: false }),
      supabase.from("vault_links").select("*"),
    ]);
    if (notesRes.error) {
      setSnapshot(null);
      setError(notesRes.error.message);
      setLoading(false);
      return;
    }
    setSnapshot(buildSnapshot(notesRes.data ?? [], linksRes.data ?? []));
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refresh();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { snapshot, loading, error, refresh };
}
