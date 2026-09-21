#!/usr/bin/env node
import { parseArgs, c, say, fail } from "../src/ui.js";
import ask from "../src/commands/ask.js";
import learn from "../src/commands/learn.js";
import {
  listCmd,
  showCmd,
  syncCmd,
  initCmd,
  configCmd,
  providersCmd,
  metaCmd,
} from "../src/commands/vault-ops.js";

const VERSION = "0.2.0";

const HELP = `
${c.ice("❄  BrainFrost")} ${c.dim(`v${VERSION}`)}  ${c.dim("— o seu contexto, em qualquer IA")}

${c.white("bfrost ask")} "pergunta"        injeta o cofre e manda para a IA escolhida
    --provider <nome>         claude, ollama, anthropic, openai, cortex, print…
    --model <nome>            modelo, quando o provedor aceitar
    --format plain|json|sql   formato do payload
    --only a,b                usa só essas camadas ou tags
    --dry                     mostra o prompt sem enviar
    --copy                    manda para a área de transferência
    --out <arquivo>           grava o resultado em arquivo
    --no-pull                 não puxa do Git antes

${c.white("bfrost learn")} "título" "conteúdo"   grava o aprendizado e sobe pro Git
    --tags a,b                tags da entrada
    --links slug,slug         cria os WikiLinks de relacionamento
    --file nome               grava numa camada própria em vez do log
    --no-push                 só grava local

${c.white("bfrost providers")}              lista as IAs configuradas e a que está ativa
${c.white("bfrost list")}                   mapa das camadas, conexões e órfãos
${c.white("bfrost show")} <slug>            imprime uma camada
${c.white("bfrost sync")}                   pull + commit + push (regera _meta.json)
${c.white("bfrost init")}                   cria o cofre .brainfrost aqui
${c.white("bfrost config")}                 mostra ou muda cofre, provedor e modelo
${c.white("bfrost meta")}                   regera .brainfrost/_meta.json (o /config da UI lê daqui)

${c.dim("Exemplos:")}
  ${c.dim("$")} bfrost ask "revisa esta modelagem" --provider claude
  ${c.dim("$")} bfrost ask "mesma coisa" --provider cortex --copy
  ${c.dim("$")} bfrost learn "Chave do MERGE" "Sempre explícita." --links padroes_arquitetura
`;

const COMMANDS = {
  ask,
  a: ask,
  learn,
  l: learn,
  list: listCmd,
  ls: listCmd,
  show: showCmd,
  cat: showCmd,
  sync: syncCmd,
  init: initCmd,
  config: configCmd,
  providers: providersCmd,
  meta: metaCmd,
};

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const [name, ...rest] = positional;

  if (!name || flags.help || name === "help") {
    say(HELP);
    return;
  }
  if (flags.version || name === "version") {
    say(`brainfrost ${VERSION}`);
    return;
  }

  const command = COMMANDS[name];
  if (!command) {
    fail(`Comando "${name}" não existe. Rode bfrost --help para ver a lista.`);
    process.exit(1);
  }

  try {
    await command(rest, flags);
  } catch (error) {
    fail(error.message);
    process.exit(1);
  }
}

main();
