import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// conversation.js resolve o path a partir de os.homedir(); apontamos $HOME e
// $USERPROFILE pra um dir descartável antes de importar o módulo.
const TMP_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "bfrost-convo-home-"));
process.env.HOME = TMP_HOME;
process.env.USERPROFILE = TMP_HOME;

const module = await import("../../src/conversation.js");
const {
  loadConversation,
  saveConversation,
  newConversation,
  appendTurn,
  clearConversation,
  CONVO_FILE,
} = module;

after(() => {
  fs.rmSync(TMP_HOME, { recursive: true, force: true });
});

before(() => clearConversation());

test("CONVO_FILE vive dentro do HOME temporário", () => {
  assert.ok(CONVO_FILE.startsWith(TMP_HOME), `esperado dentro de ${TMP_HOME}, veio ${CONVO_FILE}`);
});

test("loadConversation devolve null quando não existe", () => {
  clearConversation();
  assert.equal(loadConversation(), null);
});

test("newConversation + saveConversation gera JSON persistido", () => {
  const convo = newConversation("openrouter", "anthropic/claude-sonnet-4.5");
  assert.equal(convo.provider, "openrouter");
  assert.equal(convo.model, "anthropic/claude-sonnet-4.5");
  assert.equal(convo.messages.length, 0);
  saveConversation(convo);
  const loaded = loadConversation();
  assert.deepEqual(loaded.messages, []);
  assert.equal(loaded.provider, "openrouter");
});

test("appendTurn acrescenta user+assistant e atualiza updatedAt", () => {
  const convo = loadConversation();
  const before = convo.updatedAt;
  // pequena espera pra garantir diff de timestamp
  const later = new Date(Date.now() + 5).toISOString();
  convo.updatedAt = later;
  appendTurn(convo, "primeira pergunta", "primeira resposta");
  assert.equal(convo.messages.length, 2);
  assert.equal(convo.messages[0].role, "user");
  assert.equal(convo.messages[1].role, "assistant");
  saveConversation(convo);
  assert.notEqual(loadConversation().updatedAt, before);
});

test("appendTurn aceita mensagem só do usuário (assistantContent null)", () => {
  const convo = loadConversation();
  const priorLen = convo.messages.length;
  appendTurn(convo, "só pergunta", null);
  assert.equal(convo.messages.length, priorLen + 1);
  assert.equal(convo.messages[convo.messages.length - 1].role, "user");
});

test("clearConversation apaga o arquivo", () => {
  clearConversation();
  assert.equal(loadConversation(), null);
  assert.equal(fs.existsSync(CONVO_FILE), false);
});
