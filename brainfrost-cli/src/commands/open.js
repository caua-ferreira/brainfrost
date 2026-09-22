import { spawn, spawnSync } from "node:child_process";
import { loadConfig } from "../config.js";
import { readVault, slugify } from "../vault.js";
import { c, say, flake, ok } from "../ui.js";

/**
 * $VISUAL e $EDITOR são convenção POSIX; se nada vier, tentamos os
 * editores mais prováveis num Windows/Mac/Linux moderno. Se nenhum abrir,
 * imprimimos o caminho pra o dono resolver — nunca deixa o usuário sem saída.
 */
const FALLBACKS = ["code", "codium", "subl", "cursor"];

function resolveEditor(explicit) {
  if (explicit && explicit !== true) return String(explicit);
  if (process.env.VISUAL) return process.env.VISUAL;
  if (process.env.EDITOR) return process.env.EDITOR;
  for (const bin of FALLBACKS) {
    const probe = spawnSync(process.platform === "win32" ? "where" : "which", [bin], {
      stdio: "ignore",
    });
    if (probe.status === 0) return bin;
  }
  return null;
}

export default function open(positional, flags) {
  const wanted = slugify(positional[0] || "");
  if (!wanted) {
    throw new Error("Diga qual camada. Exemplo: bfrost open padroes_arquitetura");
  }
  const config = loadConfig();
  const notes = readVault(config.vault);
  const note = notes.find((n) => n.slug === wanted);
  if (!note) {
    throw new Error(`Camada "${wanted}" não existe. Rode bfrost list para ver o que tem.`);
  }

  const editor = resolveEditor(flags.editor);
  if (!editor) {
    flake(`arquivo em ${c.white(note.path)}`);
    say(c.dim("   sem editor detectado — exporte $EDITOR ou instale code/codium/subl/cursor."));
    return;
  }

  const child = spawn(editor, [note.path], {
    stdio: "inherit",
    shell: true,
    detached: true,
  });
  child.on("error", (error) => {
    throw new Error(`Não consegui rodar "${editor}": ${error.message}`);
  });
  child.unref();
  ok(`abrindo ${c.white(note.slug)} em ${editor}`);
  say(c.dim(`   ${note.path}`));
}
