import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const RC_FILE = path.join(os.homedir(), ".brainfrostrc");
const VAULT_DIR = ".brainfrost";

const DEFAULTS = {
  vault: null,
  // Padrão neutro: imprime o prompt e você cola em qualquer IA.
  provider: "print",
  // Sobrescreve ou cria provedores. Ex.: { "meu-lm": { kind: "http", url: "...", api: "openai" } }
  providers: {},
  // Texto de instrução que abre o prompt. null usa o padrão do BrainFrost.
  header: null,
  autoPull: true,
  autoPush: true,
};

function readRc() {
  if (!fs.existsSync(RC_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(RC_FILE, "utf8"));
  } catch {
    throw new Error(
      `O arquivo ${RC_FILE} não é um JSON válido. Corrija ou apague para voltar ao padrão.`
    );
  }
}

export function writeRc(patch) {
  const next = { ...readRc(), ...patch };
  fs.writeFileSync(RC_FILE, JSON.stringify(next, null, 2) + "\n", "utf8");
  return { file: RC_FILE, config: next };
}

/**
 * Procura a pasta .brainfrost subindo a partir de um ponto de partida.
 * Assim o comando funciona de qualquer subpasta do repositório.
 */
function findVaultUpwards(start) {
  let dir = path.resolve(start);
  for (;;) {
    const candidate = path.join(dir, VAULT_DIR);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadConfig() {
  const rc = readRc();
  const config = { ...DEFAULTS, ...rc };

  const explicit = process.env.BRAINFROST_VAULT || config.vault;
  const vault = explicit
    ? path.resolve(explicit.replace(/^~(?=$|\/)/, os.homedir()))
    : findVaultUpwards(process.cwd());

  if (!vault) {
    throw new Error(
      [
        "Cofre não encontrado.",
        "",
        "Escolha um caminho:",
        "  bfrost init                      cria .brainfrost na pasta atual",
        "  bfrost config --vault ~/brainfrost/.brainfrost",
        "  export BRAINFROST_VAULT=/caminho/.brainfrost",
      ].join("\n")
    );
  }

  return {
    ...config,
    vault,
    repo: path.dirname(vault),
    rcFile: RC_FILE,
  };
}

export { VAULT_DIR };
