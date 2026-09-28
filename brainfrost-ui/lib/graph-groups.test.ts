import { describe, expect, test } from "vitest";
import { buildGroupGraph, buildNoteGroups } from "./graph-groups";
import type { GraphData, Note } from "./types";

function note(overrides: Partial<Note>): Note {
  return {
    slug: "note",
    file: "note.md",
    title: "Note",
    tags: [],
    layer: "growth",
    category: "projeto",
    content: "conteúdo",
    raw: "conteúdo",
    excerpt: "conteúdo",
    links: [],
    backlinks: [],
    broken: [],
    updatedAt: "2026-09-28T00:00:00Z",
    words: 1,
    ...overrides,
  };
}

describe("graph groups", () => {
  test("agrupa camadas por categoria e preserva o conteúdo de cada gaveta", () => {
    const notes = [
      note({ slug: "sql", title: "RLS", category: "padroes_arquitetura" }),
      note({ slug: "commit", title: "Commits", category: "padroes_codigo" }),
      note({ slug: "deploy", title: "Deploy", category: "padrao_webapp" }),
    ];
    const graph: GraphData = {
      nodes: notes.map((item) => ({ id: item.slug, title: item.title, layer: item.layer, degree: 1, words: 1, updatedAt: item.updatedAt })),
      links: [{ source: "sql", target: "deploy" }, { source: "commit", target: "deploy" }],
    };

    const groups = buildNoteGroups(notes, graph);
    expect(groups.map((group) => group.title)).toEqual([
      "Padrões de arquitetura",
      "Padrões de código",
      "Padrões de web app",
    ]);
    expect(groups.find((group) => group.key === "padroes_arquitetura")?.notes[0].title).toBe("RLS");
  });

  test("agrega conexões entre gavetas e guarda o peso da relação", () => {
    const notes = [
      note({ slug: "a", category: "padroes_arquitetura" }),
      note({ slug: "b", category: "padrao_webapp" }),
      note({ slug: "c", category: "padrao_webapp" }),
    ];
    const graph: GraphData = {
      nodes: [],
      links: [
        { source: "a", target: "b" },
        { source: "a", target: "c" },
      ],
    };

    const groups = buildNoteGroups(notes, graph);
    const grouped = buildGroupGraph(groups, graph);
    expect(grouped.nodes).toHaveLength(2);
    expect(grouped.links).toEqual([
      { source: "group:padrao_webapp", target: "group:padroes_arquitetura", weight: 2 },
    ]);
  });
});
