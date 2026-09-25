import { writeRc } from "../config.js";
import { ok, fail, say, c } from "../ui.js";

/**
 * `bfrost login`
 *
 * Espera o blob JSON que a tela /config da UI copia:
 * `{ "url": "...", "anonKey": "...", "accessToken": "...", "refreshToken": "..." }`
 *
 * Formas de entrar:
 *   echo '<json>' | bfrost login
 *   bfrost login --token '<json>'
 *   bfrost login --file token.json
 */
export default async function login(_positional, flags) {
  let raw = null;

  if (flags.token && flags.token !== true) {
    raw = String(flags.token);
  } else if (flags.file && flags.file !== true) {
    const fs = await import("node:fs");
    raw = fs.readFileSync(String(flags.file), "utf8");
  } else if (!process.stdin.isTTY) {
    raw = await readStdin();
  }

  if (!raw || !raw.trim()) {
    say(
      [
        `${c.ice("bfrost login")} — precisa do blob copiado na tela ${c.white("/config")} da UI.`,
        "",
        "Formas:",
        `  ${c.dim("$")} echo '<json>' | bfrost login`,
        `  ${c.dim("$")} bfrost login --token '<json>'`,
        `  ${c.dim("$")} bfrost login --file token.json`,
      ].join("\n")
    );
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    fail("O que você passou não é JSON válido. Copie de novo pela UI.");
    process.exit(1);
  }

  const missing = ["url", "anonKey", "accessToken", "refreshToken"].filter(
    (k) => typeof payload[k] !== "string" || payload[k].length < 8
  );
  if (missing.length) {
    fail(`Faltando ou inválido no blob: ${missing.join(", ")}`);
    process.exit(1);
  }

  const { file } = writeRc({
    remote: {
      url: payload.url,
      anonKey: payload.anonKey,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      updatedAt: new Date().toISOString(),
    },
  });

  ok(`Sessão salva em ${c.white(file)}.`);
  say(c.dim("   próximo passo: bfrost pull   (baixa suas camadas)"));
}

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}
