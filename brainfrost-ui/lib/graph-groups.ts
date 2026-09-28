import type { GraphData, Note } from "./types";

export interface NoteGroup {
  id: string;
  key: string;
  title: string;
  description: string;
  notes: Note[];
  connections: number;
  updatedAt: string;
}

const GROUPS: Record<string, { title: string; description: string }> = {
  padroes_codigo: {
    title: "Padrões de código",
    description: "Como escrever, testar e manter o código.",
  },
  padroes_arquitetura: {
    title: "Padrões de arquitetura",
    description: "Decisões estruturais, dados e integrações.",
  },
  contexto_trabalho: {
    title: "Contexto de trabalho",
    description: "Squads, ferramentas, projetos e processos.",
  },
  padrao_webapp: {
    title: "Padrões de web app",
    description: "Stack, interface, autenticação e armadilhas web.",
  },
  glossario: {
    title: "Glossário",
    description: "Nomes, conceitos e vocabulário do seu trabalho.",
  },
  projeto: {
    title: "Projetos",
    description: "Decisões específicas de cada projeto.",
  },
  log_aprendizados: {
    title: "Aprendizados",
    description: "O que o cérebro aprendeu ao longo do caminho.",
  },
  sem_categoria: {
    title: "Sem categoria",
    description: "Camadas que ainda precisam de uma gaveta.",
  },
};

export function groupKey(note: Note) {
  return note.category && GROUPS[note.category] ? note.category : "sem_categoria";
}

export function groupInfo(key: string) {
  return GROUPS[key] ?? { title: key, description: "Agrupamento do seu cérebro." };
}

export function buildNoteGroups(notes: Note[], graph: GraphData): NoteGroup[] {
  const groups = new Map<string, Note[]>();
  for (const note of notes) {
    const key = groupKey(note);
    groups.set(key, [...(groups.get(key) ?? []), note]);
  }

  const bySlug = new Map(notes.map((note) => [note.slug, note]));
  const connectionCounts = new Map<string, number>();
  for (const link of graph.links) {
    const source = bySlug.get(link.source);
    const target = bySlug.get(link.target);
    if (!source || !target) continue;
    const sourceKey = groupKey(source);
    const targetKey = groupKey(target);
    if (sourceKey === targetKey) continue;
    const key = [sourceKey, targetKey].sort().join("::");
    connectionCounts.set(key, (connectionCounts.get(key) ?? 0) + (link.weight ?? 1));
  }

  return [...groups.entries()]
    .map(([key, groupNotes]) => {
      const connections = [...connectionCounts.entries()]
        .filter(([edge]) => edge.split("::").includes(key))
        .reduce((sum, [, count]) => sum + count, 0);
      const updatedAt = groupNotes.map((note) => note.updatedAt).sort().at(-1) ?? new Date(0).toISOString();
      return {
        id: `group:${key}`,
        key,
        ...groupInfo(key),
        notes: groupNotes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        connections,
        updatedAt,
      };
    })
    .sort((a, b) => b.notes.length - a.notes.length || a.title.localeCompare(b.title));
}

export function buildGroupGraph(groups: NoteGroup[], graph: GraphData): GraphData {
  const noteToGroup = new Map<string, string>();
  for (const group of groups) {
    for (const note of group.notes) noteToGroup.set(note.slug, group.id);
  }

  const weights = new Map<string, number>();
  for (const link of graph.links) {
    const source = noteToGroup.get(link.source);
    const target = noteToGroup.get(link.target);
    if (!source || !target || source === target) continue;
    const key = [source, target].sort().join("::");
    weights.set(key, (weights.get(key) ?? 0) + (link.weight ?? 1));
  }

  return {
    nodes: groups.map((group) => ({
      id: group.id,
      title: group.title,
      kind: "group",
      count: group.notes.length,
      layer: "core",
      degree: group.connections,
      words: group.notes.reduce((sum, note) => sum + note.words, 0),
      updatedAt: group.updatedAt,
    })),
    links: [...weights.entries()].map(([key, weight]) => {
      const [source, target] = key.split("::");
      return { source, target, weight };
    }),
  };
}
