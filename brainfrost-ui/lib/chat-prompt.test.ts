import { test, expect, describe } from "vitest";
import {
  selectNotesForChat,
  formatContextForChat,
  buildChatFollowup,
  buildChatOpener,
  selectRelevantNotes,
} from "./chat-prompt";
import type { Note } from "./types";

function noteFactory(overrides: Partial<Note>): Note {
  return {
    slug: "n",
    file: "n.md",
    title: "N",
    tags: [],
    concepts: [],
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

describe("buildChatFollowup", () => {
  const commitNote = noteFactory({
    slug: "conventional-commits-sem-coautoria",
    title: "Conventional Commits sem coautoria",
    raw: "Formato tipo(scope): descrição. Coautoria não é usada — quem colabora entra na descrição do PR, não no commit.",
    content: "Formato tipo(scope): descrição. Coautoria não é usada — quem colabora entra na descrição do PR, não no commit.",
    tags: ["commits", "regras"],
  });

  test("reenviará a camada relevante e preservará negações em perguntas seguintes", () => {
    const followup = buildChatFollowup([commitNote], "E vai com coautoria ou sem?");
    expect(followup).toContain("Coautoria não é usada");
    expect(followup).toContain("sem coautoria");
    expect(followup).toContain("## DECISÃO PRIORITÁRIA");
    expect(followup).toContain("Respostas anteriores do assistente podem estar erradas");
    expect(followup).toMatch(/## PERGUNTA/);
    expect(followup).toMatch(/E vai com coautoria ou sem\?$/);
  });

  test("trata autoria como termo relacionado a coautoria", () => {
    const followup = buildChatFollowup([commitNote], "Eu gosto de commitar com autoria ou sem?");
    expect(followup).toContain("Coautoria não é usada");
    expect(followup).toMatch(/Eu gosto de commitar com autoria ou sem\?$/);
  });

  test("prioriza notas que compartilham termos com a pergunta", () => {
    const unrelated = noteFactory({ title: "Receitas", raw: "Bolo de cenoura" });
    expect(selectRelevantNotes([unrelated, commitNote], "qual regra de coautoria devo seguir?")[0]).toBe(commitNote);
  });
});
