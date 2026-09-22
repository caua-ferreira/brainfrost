import { test } from "node:test";
import assert from "node:assert/strict";
import { selectNotes, formatContext, buildPrompt } from "../src/prompt.js";

function noteFactory(overrides) {
  return {
    slug: "note",
    title: "Nota",
    tags: [],
    layer: "growth",
    body: "corpo",
    updatedAt: "2026-09-21T00:00:00Z",
    links: [],
    backlinks: [],
    degree: 0,
    ...overrides,
  };
}

const NOTES = [
  noteFactory({ slug: "a-growth", title: "A Growth", layer: "growth", tags: ["y"] }),
  noteFactory({ slug: "index", title: "Índice", layer: "core" }),
  noteFactory({ slug: "b-core", title: "B Core", layer: "core", tags: ["x"] }),
];

test("selectNotes: index primeiro, core antes de growth, alfabético dentro", () => {
  const ordered = selectNotes(NOTES, null);
  assert.deepEqual(
    ordered.map((n) => n.slug),
    ["index", "b-core", "a-growth"]
  );
});

test("selectNotes: filtra por slug exato", () => {
  const ordered = selectNotes(NOTES, ["b-core"]);
  assert.deepEqual(ordered.map((n) => n.slug), ["b-core"]);
});

test("selectNotes: filtra por tag", () => {
  const ordered = selectNotes(NOTES, ["x"]);
  assert.deepEqual(ordered.map((n) => n.slug), ["b-core"]);
});

test("selectNotes: filtro sem match lança erro amigável", () => {
  assert.throws(() => selectNotes(NOTES, ["nao-existe"]), /Nenhuma camada/);
});

test("formatContext usa H3 + marca camada e data", () => {
  const context = formatContext([NOTES[1]]);
  assert.match(context, /### Índice/);
  assert.match(context, /camada: index/);
  assert.match(context, /atualizada: 2026-09-21/);
});

test("buildPrompt encaixa CONTEXTO e PERGUNTA na ordem certa", () => {
  const { prompt, used, tokens } = buildPrompt(NOTES, "por que MERGE explícito?", {});
  assert.match(prompt, /## CONTEXTO/);
  assert.match(prompt, /## PERGUNTA/);
  assert.ok(prompt.indexOf("## CONTEXTO") < prompt.indexOf("## PERGUNTA"));
  assert.match(prompt.trim(), /por que MERGE explícito\?$/);
  assert.deepEqual(used, ["index", "b-core", "a-growth"]);
  assert.ok(tokens > 0);
});

test("buildPrompt aceita header customizado", () => {
  const { prompt } = buildPrompt(NOTES, "x", { header: "cabeçalho meu" });
  assert.match(prompt, /^cabeçalho meu/);
});
