import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { START, END, buildBlock, mergeIntoFile } from "../../src/commands/inject.js";

function tmpFile(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return path.join(dir, "CLAUDE.md");
}

const FAKE_NOTE = {
  slug: "padroes-codigo",
  title: "Padrões de Código",
  updatedAt: "2026-09-21T00:00:00Z",
  body: "MERGE sempre com chave explícita.",
};

test("buildBlock envolve o contexto com marcadores idempotentes", () => {
  const block = buildBlock([FAKE_NOTE], "1 camada de teste");
  assert.ok(block.startsWith(START));
  assert.ok(block.endsWith(END));
  assert.match(block, /Padrões de Código/);
  assert.match(block, /MERGE sempre com chave explícita\./);
  assert.match(block, /1 camada de teste/);
});

test("mergeIntoFile: cria arquivo do zero quando não existe", () => {
  const target = tmpFile("bfrost-inject-create-");
  const block = buildBlock([FAKE_NOTE], "criação");
  const action = mergeIntoFile(target, block);
  assert.equal(action, "created");
  const content = fs.readFileSync(target, "utf8");
  assert.ok(content.includes(START));
  assert.ok(content.includes(END));
});

test("mergeIntoFile: anexa no fim quando o arquivo existe sem marcadores", () => {
  const target = tmpFile("bfrost-inject-append-");
  fs.writeFileSync(target, "# Meu Projeto\n\nnota antes do bloco\n");
  const block = buildBlock([FAKE_NOTE], "append");
  const action = mergeIntoFile(target, block);
  assert.equal(action, "appended");
  const content = fs.readFileSync(target, "utf8");
  assert.match(content, /^# Meu Projeto/);
  assert.ok(content.indexOf("nota antes do bloco") < content.indexOf(START));
});

test("mergeIntoFile: substitui entre marcadores quando o arquivo já tem", () => {
  const target = tmpFile("bfrost-inject-replace-");
  const first = buildBlock([{ ...FAKE_NOTE, body: "primeira versão" }], "v1");
  mergeIntoFile(target, first);
  const second = buildBlock([{ ...FAKE_NOTE, body: "segunda versão" }], "v2");
  const action = mergeIntoFile(target, second);
  assert.equal(action, "replaced");
  const content = fs.readFileSync(target, "utf8");
  const starts = content.match(new RegExp(START, "g")) ?? [];
  const ends = content.match(new RegExp(END, "g")) ?? [];
  assert.equal(starts.length, 1, "marcadores não podem duplicar");
  assert.equal(ends.length, 1);
  assert.match(content, /segunda versão/);
  assert.doesNotMatch(content, /primeira versão/);
});

test("mergeIntoFile: preserva conteúdo antes e depois dos marcadores no replace", () => {
  const target = tmpFile("bfrost-inject-preserve-");
  const block = buildBlock([FAKE_NOTE], "com envoltório");
  const wrapper = `# Título do repo\n\n${block}\n\n## Notas finais\n\nrodapé\n`;
  fs.writeFileSync(target, wrapper);
  const nextBlock = buildBlock([{ ...FAKE_NOTE, body: "atualizado" }], "novo");
  mergeIntoFile(target, nextBlock);
  const content = fs.readFileSync(target, "utf8");
  assert.match(content, /^# Título do repo/);
  assert.match(content, /## Notas finais/);
  assert.match(content, /atualizado/);
});
