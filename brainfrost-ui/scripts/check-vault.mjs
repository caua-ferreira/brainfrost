// Diagnóstico rápido: mostra onde o build vai achar o cofre.
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const candidates = [
  process.env.BRAINFROST_VAULT && path.resolve(cwd, process.env.BRAINFROST_VAULT),
  path.resolve(cwd, "../.brainfrost"),
  path.resolve(cwd, ".brainfrost"),
  path.resolve(cwd, "content"),
].filter(Boolean);

let found = null;
for (const candidate of candidates) {
  const exists = fs.existsSync(candidate);
  console.log(`${exists ? "✓" : "·"} ${candidate}`);
  if (exists && !found) found = candidate;
}

if (!found) {
  console.error("\nNenhum cofre encontrado. Defina BRAINFROST_VAULT ou copie .brainfrost para ./content");
  process.exit(1);
}

const files = fs.readdirSync(found).filter((f) => f.endsWith(".md"));
console.log(`\n❄  ${files.length} camadas em ${found}`);
files.forEach((f) => console.log(`   ${f}`));
