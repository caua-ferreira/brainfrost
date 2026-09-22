import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, REASONS } from "../../src/commands/prune.js";

function noteFactory(overrides) {
  return {
    slug: "n",
    title: "N",
    layer: "growth",
    body: "corpo com mais de trinta palavras ".repeat(6),
    updatedAt: new Date().toISOString(),
    links: [],
    backlinks: [],
    degree: 0,
    broken: [],
    ...overrides,
  };
}

test("classify: ORFAO quando degree 0 (sem links entrando ou saindo)", () => {
  const r = classify(noteFactory({ links: [], backlinks: [], degree: 0 }));
  assert.ok(r.findings.includes("ORFAO"));
  assert.ok(!r.findings.includes("SEM_ENTRADA"));
  assert.ok(!r.findings.includes("SEM_SAIDA"));
});

test("classify: SEM_ENTRADA quando cita mas ninguém cita ela", () => {
  const r = classify(
    noteFactory({ links: ["outro"], backlinks: [], degree: 1 })
  );
  assert.ok(r.findings.includes("SEM_ENTRADA"));
  assert.ok(!r.findings.includes("ORFAO"));
});

test("classify: SEM_SAIDA quando só recebe citações", () => {
  const r = classify(
    noteFactory({ links: [], backlinks: ["outro"], degree: 1 })
  );
  assert.ok(r.findings.includes("SEM_SAIDA"));
});

test("classify: MUITO_CURTA quando corpo tem menos de 30 palavras", () => {
  const r = classify(
    noteFactory({
      body: "muito curta",
      links: ["x"],
      backlinks: ["y"],
      degree: 2,
    })
  );
  assert.ok(r.findings.includes("MUITO_CURTA"));
  assert.ok(r.words < 30);
});

test("classify: ESQUECIDA para camada antiga com pouca conexão", () => {
  const oneYearAgo = new Date(Date.now() - 366 * 86_400_000).toISOString();
  const r = classify(
    noteFactory({
      updatedAt: oneYearAgo,
      links: ["x"],
      backlinks: [],
      degree: 1,
    })
  );
  assert.ok(r.findings.includes("ESQUECIDA"));
  assert.ok(r.age > 180);
});

test("classify: QUEBRADOS quando aponta pra camadas inexistentes", () => {
  const r = classify(
    noteFactory({
      links: ["outro"],
      backlinks: ["y"],
      degree: 2,
      broken: ["fantasma"],
    })
  );
  assert.ok(r.findings.includes("QUEBRADOS"));
});

test("classify: pode acumular múltiplos findings", () => {
  const r = classify(
    noteFactory({
      body: "curta",
      links: [],
      backlinks: [],
      degree: 0,
      broken: ["fantasma"],
    })
  );
  assert.ok(r.findings.includes("ORFAO"));
  assert.ok(r.findings.includes("MUITO_CURTA"));
  assert.ok(r.findings.includes("QUEBRADOS"));
});

test("classify: camada saudável não retorna finding algum", () => {
  const r = classify(
    noteFactory({
      body: "corpo com bem mais de trinta palavras: ".repeat(10),
      links: ["a", "b"],
      backlinks: ["c"],
      degree: 3,
    })
  );
  assert.deepEqual(r.findings, []);
});

test("REASONS documenta todas as categorias que classify emite", () => {
  const keys = ["ORFAO", "SEM_ENTRADA", "SEM_SAIDA", "MUITO_CURTA", "ESQUECIDA", "QUEBRADOS"];
  for (const k of keys) assert.ok(REASONS[k], `${k} sem descrição`);
});
