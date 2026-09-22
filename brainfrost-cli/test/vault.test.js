import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  slugify,
  parseFrontmatter,
  extractLinks,
  readVault,
  vaultStats,
  estimateTokens,
} from "../src/vault.js";

test("slugify normaliza acentos, maiúsculas e separadores", () => {
  assert.equal(slugify("Padrões de Arquitetura"), "padroes-de-arquitetura");
  assert.equal(slugify("padroes_arquitetura"), "padroes-arquitetura");
  assert.equal(slugify("padroes_arquitetura.md"), "padroes-arquitetura");
  assert.equal(slugify("Já-Feito!"), "ja-feito");
  assert.equal(slugify("  espacos   sobrando  "), "espacos-sobrando");
});

test("parseFrontmatter lê chave/valor, listas inline e listas com hífen", () => {
  const raw = `---
title: Teste
tags: [a, b]
layer: core
autores:
  - Cauã
  - IA
---

corpo do texto`;
  const { data, body } = parseFrontmatter(raw);
  assert.equal(data.title, "Teste");
  assert.deepEqual(data.tags, ["a", "b"]);
  assert.equal(data.layer, "core");
  assert.deepEqual(data.autores, ["Cauã", "IA"]);
  assert.equal(body.trim(), "corpo do texto");
});

test("parseFrontmatter devolve vazio quando não há frontmatter", () => {
  const { data, body } = parseFrontmatter("só corpo");
  assert.deepEqual(data, {});
  assert.equal(body, "só corpo");
});

test("extractLinks captura WikiLinks únicos, ignora âncoras", () => {
  const links = extractLinks(
    "veja [[padroes_codigo]] e [[Padrões Código]] e [[trabalho#secao]] e [[padroes_codigo|com rótulo]]"
  );
  const set = new Set(links);
  assert.equal(set.size, 2);
  assert.ok(set.has("padroes-codigo"));
  assert.ok(set.has("trabalho"));
});

test("readVault popula backlinks, degree e detecta links quebrados", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bfrost-vault-"));
  fs.writeFileSync(
    path.join(tmp, "a.md"),
    "---\ntitle: A\nlayer: core\n---\naponta pra [[b]] e [[fantasma]]"
  );
  fs.writeFileSync(path.join(tmp, "b.md"), "---\ntitle: B\n---\ncorpo");

  const notes = readVault(tmp);
  const a = notes.find((n) => n.slug === "a");
  const b = notes.find((n) => n.slug === "b");

  assert.deepEqual(a.links, ["b"]);
  assert.deepEqual(a.broken, ["fantasma"]);
  assert.deepEqual(b.backlinks, ["a"]);
  assert.equal(a.degree, 1);
  assert.equal(b.degree, 1);
  assert.equal(a.layer, "core");
  assert.equal(b.layer, "growth"); // padrão quando o frontmatter não define

  fs.rmSync(tmp, { recursive: true, force: true });
});

test("vaultStats conta arestas únicas e agrega quebras", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bfrost-stats-"));
  fs.writeFileSync(path.join(tmp, "a.md"), "---\ntitle: A\n---\n[[b]] e [[c]]");
  fs.writeFileSync(path.join(tmp, "b.md"), "---\ntitle: B\n---\n[[a]]"); // link recíproco vira 1 aresta
  fs.writeFileSync(path.join(tmp, "c.md"), "---\ntitle: C\n---\n[[fantasma]]");
  const notes = readVault(tmp);
  const stats = vaultStats(notes);
  assert.equal(stats.notes, 3);
  assert.equal(stats.edges, 2); // a-b e a-c
  assert.deepEqual(stats.orphans, []);
  assert.ok(stats.broken.some((line) => line.includes("fantasma")));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("estimateTokens aproxima ~4 chars/token", () => {
  assert.equal(estimateTokens(0), 0);
  assert.equal(estimateTokens(4), 1);
  assert.equal(estimateTokens(400), 100);
});
