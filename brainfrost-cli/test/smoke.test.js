import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Smoke end-to-end: exercita o binário do CLI num cofre temporário e
 * confere as saídas + artefatos gerados. Não depende de `npm link`,
 * de rede, nem de credenciais — cada teste usa dir descartável e
 * providers "print" (sem chamadas externas).
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(here, "../bin/brainfrost.js");

let WORKDIR;
let HOMEDIR;

function bfrost(args, extraEnv = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd: WORKDIR,
    env: {
      ...process.env,
      HOME: HOMEDIR,
      USERPROFILE: HOMEDIR,
      NO_COLOR: "1",
      // O CLI procura o cofre no CWD; deixamos ele descobrir sozinho quando faz sentido.
      ...extraEnv,
    },
    encoding: "utf8",
  });
}

before(() => {
  WORKDIR = fs.mkdtempSync(path.join(os.tmpdir(), "bfrost-smoke-work-"));
  HOMEDIR = fs.mkdtempSync(path.join(os.tmpdir(), "bfrost-smoke-home-"));
});

after(() => {
  fs.rmSync(WORKDIR, { recursive: true, force: true });
  fs.rmSync(HOMEDIR, { recursive: true, force: true });
});

test("smoke: --help imprime a lista de comandos", () => {
  const r = bfrost(["--help"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /BrainFrost/);
  assert.match(r.stdout, /bfrost ask/);
  assert.match(r.stdout, /bfrost learn/);
  assert.match(r.stdout, /bfrost inject/);
  assert.match(r.stdout, /bfrost prune/);
  assert.match(r.stdout, /bfrost open/);
});

test("smoke: --version reporta versão", () => {
  const r = bfrost(["--version"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /brainfrost \d+\.\d+\.\d+/);
});

test("smoke: bfrost init cria o cofre com camadas base", () => {
  const r = bfrost(["init"]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(WORKDIR, ".brainfrost")));
  assert.ok(fs.existsSync(path.join(WORKDIR, ".brainfrost", "index.md")));
  assert.ok(fs.existsSync(path.join(WORKDIR, ".brainfrost", "log_aprendizados.md")));
});

test("smoke: bfrost list mostra as camadas iniciais", () => {
  const r = bfrost(["list"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /index/);
  assert.match(r.stdout, /camadas/);
});

test("smoke: bfrost show <slug> imprime o corpo", () => {
  const r = bfrost(["show", "index"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Índice/);
});

test("smoke: bfrost learn --no-push grava camada nova sem tocar git", () => {
  const r = bfrost([
    "learn",
    "Teste automatizado",
    "conteúdo mínimo do teste",
    "--file",
    "teste_smoke",
    "--tags",
    "smoke,ci",
    "--no-push",
  ]);
  assert.equal(r.status, 0, r.stderr);
  // slugify normaliza `_` para `-`, então o arquivo vira teste-smoke.md.
  const target = path.join(WORKDIR, ".brainfrost", "teste-smoke.md");
  assert.ok(fs.existsSync(target), "camada teste-smoke.md deveria existir");
  const raw = fs.readFileSync(target, "utf8");
  assert.match(raw, /Teste automatizado/);
  assert.match(raw, /conteúdo mínimo do teste/);
  assert.match(raw, /smoke/);
});

test("smoke: bfrost providers lista pelo menos os presets padrão", () => {
  const r = bfrost(["providers"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /print/);
  assert.match(r.stdout, /anthropic/);
  assert.match(r.stdout, /openai/);
});

test("smoke: bfrost ask --dry monta prompt sem chamar nada", () => {
  const r = bfrost([
    "ask",
    "o que tem no cofre?",
    "--dry",
    "--no-pull",
    "--provider",
    "print",
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /## CONTEXTO/);
  assert.match(r.stdout, /## PERGUNTA/);
  assert.match(r.stdout, /o que tem no cofre\?/);
});

test("smoke: bfrost inject --dry mostra o bloco sem escrever", () => {
  const r = bfrost(["inject", "--dry"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /brainfrost:inject-start/);
  assert.match(r.stdout, /brainfrost:inject-end/);
  // --dry não pode ter criado o arquivo
  assert.equal(fs.existsSync(path.join(WORKDIR, "CLAUDE.md")), false);
});

test("smoke: bfrost inject grava CLAUDE.md; rodar de novo não duplica", () => {
  const first = bfrost(["inject"]);
  assert.equal(first.status, 0, first.stderr);
  const target = path.join(WORKDIR, "CLAUDE.md");
  assert.ok(fs.existsSync(target));

  const second = bfrost(["inject"]);
  assert.equal(second.status, 0, second.stderr);
  const content = fs.readFileSync(target, "utf8");
  const starts = content.match(/brainfrost:inject-start/g) ?? [];
  const ends = content.match(/brainfrost:inject-end/g) ?? [];
  assert.equal(starts.length, 1, "marcador start duplicado");
  assert.equal(ends.length, 1, "marcador end duplicado");
});

test("smoke: bfrost inject --only filtra por slug", () => {
  const target = path.join(WORKDIR, "CLAUDE_only.md");
  const r = bfrost(["inject", "--only", "index", "--file", target]);
  assert.equal(r.status, 0, r.stderr);
  const content = fs.readFileSync(target, "utf8");
  // A marca "camada: <slug>" só entra uma vez por camada incluída — se filtrou
  // por "index", nenhuma outra camada pode ter aparecido. WikiLinks no corpo
  // do próprio index citando log_aprendizados são texto, não indica inclusão.
  assert.match(content, /camada: index/);
  assert.doesNotMatch(content, /camada: log-aprendizados/);
  assert.doesNotMatch(content, /camada: teste-smoke\b/);
});

test("smoke: bfrost meta gera _meta.json com providers e activeProvider", () => {
  const r = bfrost(["meta"]);
  assert.equal(r.status, 0, r.stderr);
  const target = path.join(WORKDIR, ".brainfrost", "_meta.json");
  assert.ok(fs.existsSync(target));
  const meta = JSON.parse(fs.readFileSync(target, "utf8"));
  assert.equal(meta.schema, 1);
  assert.ok(Array.isArray(meta.providers));
  assert.ok(meta.providers.some((p) => p.name === "anthropic"));
  assert.ok(typeof meta.activeProvider === "string");
});

test("smoke: bfrost prune reporta a camada de teste com poucas palavras", () => {
  const r = bfrost(["prune"]);
  assert.equal(r.status, 0, r.stderr);
  // A camada teste_smoke tem 4 palavras — deve cair em MUITO_CURTA.
  assert.match(r.stdout, /teste-smoke|MUITO_CURTA/i);
});

test("smoke: bfrost prune --json devolve array parseável", () => {
  const r = bfrost(["prune", "--json"]);
  assert.equal(r.status, 0, r.stderr);
  const parsed = JSON.parse(r.stdout);
  assert.ok(Array.isArray(parsed));
  // Cofre novo pode ter algum finding (log vazio, camada teste_smoke curta);
  // basta ser array bem-formado.
});

test("smoke: comando inexistente sai com código 1 e mensagem clara", () => {
  const r = bfrost(["não-existe"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Comando/);
});

test("smoke: bfrost show <slug-inexistente> falha com mensagem clara", () => {
  const r = bfrost(["show", "camada-que-nao-existe"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Camada/);
});
