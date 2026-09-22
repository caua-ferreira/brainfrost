import { test, expect, describe } from "vitest";
import { selectNotesForChat, formatContextForChat, buildChatOpener } from "./chat-prompt";
import type { Note } from "./types";

function noteFactory(overrides: Partial<Note>): Note {
  return {
    slug: "n",
    file: "n.md",
    title: "N",
    tags: [],
    layer: "growth",
    content: "corpo",
    raw: "corpo",
    excerpt: "",
    links: [],
    backlinks: [],
    broken: [],
    updatedAt: "2026-09-21T00:00:00Z",
    words: 1,
    ...overrides,
  };
}

const NOTES: Note[] = [
  noteFactory({ slug: "a-growth", title: "A Growth", layer: "growth" }),
  noteFactory({ slug: "index", title: "Índice", layer: "core" }),
  noteFactory({ slug: "b-core", title: "B Core", layer: "core", tags: ["x"] }),
];

describe("selectNotesForChat", () => {
  test("index primeiro, core antes de growth, alfabético dentro", () => {
    const ordered = selectNotesForChat(NOTES, null);
    expect(ordered.map((n) => n.slug)).toEqual(["index", "b-core", "a-growth"]);
  });

  test("filtra por slug", () => {
    const ordered = selectNotesForChat(NOTES, ["b-core"]);
    expect(ordered.map((n) => n.slug)).toEqual(["b-core"]);
  });

  test("filtra por tag", () => {
    const ordered = selectNotesForChat(NOTES, ["x"]);
    expect(ordered.map((n) => n.slug)).toEqual(["b-core"]);
  });

  test("sem match devolve vazio (comportamento client-side)", () => {
    const ordered = selectNotesForChat(NOTES, ["nao-existe"]);
    expect(ordered).toEqual([]);
  });
});

describe("formatContextForChat", () => {
  test("usa H3 + comentário camada/data", () => {
    const context = formatContextForChat([NOTES[1]]);
    expect(context).toMatch(/### Índice/);
    expect(context).toMatch(/camada: index/);
    expect(context).toMatch(/atualizada: 2026-09-21/);
  });
});

describe("buildChatOpener", () => {
  test("monta header + ## CONTEXTO + ## PERGUNTA na ordem", () => {
    const opener = buildChatOpener(NOTES, null, "minha dúvida");
    expect(opener).toMatch(/## CONTEXTO/);
    expect(opener).toMatch(/## PERGUNTA/);
    expect(opener.indexOf("## CONTEXTO")).toBeLessThan(opener.indexOf("## PERGUNTA"));
    expect(opener.trim()).toMatch(/minha dúvida$/);
  });

  test("respeita filtro de camadas", () => {
    const opener = buildChatOpener(NOTES, ["b-core"], "qualquer");
    expect(opener).toMatch(/camada: b-core/);
    expect(opener).not.toMatch(/camada: index/);
  });
});
