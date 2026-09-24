import { loadConfig } from "../config.js";
import { readVault } from "../vault.js";
import { c, say, flake, warn } from "../ui.js";

/** Snippet com ±60 chars ao redor do primeiro match, com o termo em destaque. */
function snippet(text, re) {
  const m = re.exec(text);
  if (!m) return null;
  const start = Math.max(0, m.index - 60);
  const end = Math.min(text.length, m.index + m[0].length + 60);
  const before = start > 0 ? "…" : "";
  const after = end < text.length ? "…" : "";
  const slice = text.slice(start, end).replace(/\s+/g, " ");
  return before + slice.replace(re, (t) => c.ice(t)) + after;
}

export default function search(positional, flags) {
  const term = positional.join(" ").trim();
  if (!term) throw new Error('Diga o termo. Exemplo: bfrost search "MERGE"');

  const config = loadConfig();
  const notes = readVault(config.vault);
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

  const hits = notes
    .map((note) => {
      const inTitle = re.test(note.title);
      re.lastIndex = 0;
      const inTag = note.tags.some((t) => re.test(t));
      re.lastIndex = 0;
      const bodySnip = snippet(note.body, re);
      re.lastIndex = 0;
      if (!inTitle && !inTag && !bodySnip) return null;
      return { note, inTitle, inTag, bodySnip };
    })
    .filter(Boolean);

  if (flags.json) {
    say(
      JSON.stringify(
        hits.map((h) => ({
          slug: h.note.slug,
          title: h.note.title,
          matches: { title: h.inTitle, tag: h.inTag, body: Boolean(h.bodySnip) },
        })),
        null,
        2
      )
    );
    return;
  }

  flake(`busca "${term}" — ${hits.length} camadas`);
  if (!hits.length) {
    warn("nada com esse termo. Cofre limpo ou grafia diferente?");
    return;
  }
  say("");
  const width = Math.max(...hits.map((h) => h.note.slug.length), 8);
  for (const h of hits) {
    const badges = [
      h.inTitle && c.ice("título"),
      h.inTag && c.ice("tag"),
      h.bodySnip && c.dim("corpo"),
    ]
      .filter(Boolean)
      .join(" ");
    say(`  ${c.white(h.note.slug.padEnd(width))}  ${badges}`);
    if (h.bodySnip) say(`    ${c.dim(h.bodySnip)}`);
  }
}
