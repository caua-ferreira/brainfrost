import { loadConfig } from "../config.js";
import { readVault } from "../vault.js";
import { c, say, flake, warn } from "../ui.js";

const SHORT_WORDS = 30;
const STALE_DAYS = 180;
const STALE_MAX_DEGREE = 1;

export const REASONS = {
  ORFAO: "nem cita, nem é citada — candidata a juntar ou apagar",
  SEM_ENTRADA: "cita outras, ninguém cita ela — ninguém sabe que existe",
  SEM_SAIDA: "só recebe citações, não conecta com nada — ilha final",
  MUITO_CURTA: "poucas palavras — talvez não valha camada própria",
  ESQUECIDA: "sem edição há muito tempo e pouco conectada — pode estar obsoleta",
  QUEBRADOS: "aponta para camadas que não existem — arrume ou apague os links",
};

function wordCount(body) {
  return body.split(/\s+/).filter(Boolean).length;
}

function daysAgo(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function classify(note) {
  const findings = [];
  const words = wordCount(note.body);
  const backCount = note.backlinks.length;
  const outCount = note.links.length;
  const age = daysAgo(note.updatedAt);

  if (backCount === 0 && outCount === 0) findings.push("ORFAO");
  else if (backCount === 0) findings.push("SEM_ENTRADA");
  else if (outCount === 0) findings.push("SEM_SAIDA");

  if (words < SHORT_WORDS) findings.push("MUITO_CURTA");
  if (age > STALE_DAYS && note.degree <= STALE_MAX_DEGREE) findings.push("ESQUECIDA");
  if (note.broken.length > 0) findings.push("QUEBRADOS");

  return { note, words, age, findings };
}

/**
 * Só relatório — nunca escreve. O prune existe pra ajudar a olhar de
 * lado o que envelheceu ou nunca foi conectado. A decisão de apagar,
 * juntar ou linkar continua manual.
 */
export default function prune(_positional, flags) {
  const config = loadConfig();
  const notes = readVault(config.vault);

  const results = notes.map(classify).filter((r) => r.findings.length > 0);

  if (flags.json) {
    const payload = results.map((r) => ({
      slug: r.note.slug,
      title: r.note.title,
      file: r.note.file,
      words: r.words,
      ageDays: r.age,
      degree: r.note.degree,
      broken: r.note.broken,
      findings: r.findings,
    }));
    say(JSON.stringify(payload, null, 2));
    return;
  }

  flake(`prune do cofre em ${c.white(config.vault)}`);
  say("");
  if (results.length === 0) {
    say(c.dim("  nenhuma sugestão. Cofre limpo."));
    return;
  }

  const width = Math.max(...results.map((r) => r.note.slug.length), 8);
  const labelWidth = Math.max(...Object.keys(REASONS).map((k) => k.length));

  say(c.dim(`  ${results.length} camadas com algo para revisar:`));
  say("");

  for (const { note, words, age, findings } of results) {
    for (const finding of findings) {
      const label = c.ice(finding.padEnd(labelWidth));
      const slug = c.white(note.slug.padEnd(width));
      const detail = finding === "MUITO_CURTA"
        ? c.dim(`${words} palavras`)
        : finding === "ESQUECIDA"
          ? c.dim(`sem edição há ${age} dias · degree ${note.degree}`)
          : finding === "QUEBRADOS"
            ? c.dim(`aponta para: ${note.broken.join(", ")}`)
            : c.dim(REASONS[finding]);
      say(`  ${label}  ${slug}  ${detail}`);
    }
  }

  say("");
  say(c.dim("  nada é apagado — você decide o que juntar, linkar ou remover."));
  say(c.dim("  --json devolve o relatório em formato máquina-lida."));

  if (results.some((r) => r.findings.includes("QUEBRADOS"))) {
    warn("existem WikiLinks para camadas que não existem. Rode `bfrost list` para ver a lista completa.");
  }
}
