import { test, expect, describe } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { slugify, linkifyWikiLinks, readVault } from "./vault";

describe("slugify", () => {
  test("normaliza acentos, caso e separadores — igual ao CLI", () => {
    expect(slugify("Padrões de Arquitetura")).toBe("padroes-de-arquitetura");
    expect(slugify("padroes_arquitetura.md")).toBe("padroes-arquitetura");
    expect(slugify("Já-Feito!")).toBe("ja-feito");
  });
});

describe("linkifyWikiLinks", () => {
  test("converte [[slug]] para link brainfrost:", () => {
    const out = linkifyWikiLinks("veja [[padroes_codigo]]");
    expect(out).toContain("[padroes_codigo](brainfrost:padroes-codigo)");
  });

  test("preserva rótulo alternativo com [[slug|texto]]", () => {
    const out = linkifyWikiLinks("[[padroes_codigo|padrões do meu jeito]]");
    expect(out).toContain("[padrões do meu jeito](brainfrost:padroes-codigo)");
  });
});

describe("readVault", () => {
  test("lê arquivos .md, popula backlinks e detecta links quebrados", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bfrost-ui-vault-"));
    fs.writeFileSync(
      path.join(tmp, "a.md"),
      "---\ntitle: A\nlayer: core\ntags: [x, y]\n---\n\naponta pra [[b]] e [[fantasma]]"
    );
    fs.writeFileSync(path.join(tmp, "b.md"), "---\ntitle: B\n---\ncorpo\n");

    process.env.BRAINFROST_VAULT = tmp;
    try {
      const snapshot = readVault();
      const a = snapshot.notes.find((n) => n.slug === "a")!;
      const b = snapshot.notes.find((n) => n.slug === "b")!;
      expect(a.layer).toBe("core");
      expect(a.tags).toEqual(["x", "y"]);
      expect(a.links).toEqual(["b"]);
      expect(a.broken).toEqual(["fantasma"]);
      expect(b.backlinks).toEqual(["a"]);
      expect(snapshot.stats.notes).toBe(2);
      expect(snapshot.stats.edges).toBe(1);
      expect(a.raw).toMatch(/aponta pra/);
      expect(a.content).toContain("brainfrost:b");
    } finally {
      delete process.env.BRAINFROST_VAULT;
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

});
