import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { readZipTextFiles } from "./import-files";

describe("massa real de importação ZIP", () => {
  test("abre o ZIP versionado, lê documentos e descarta arquivo sensível", async () => {
    const fixturePath = resolve(
      process.cwd(),
      "../test-data/brainfrost-import-smoke/brainfrost-import-smoke.zip"
    );
    const bytes = readFileSync(fixturePath);
    const file = new File([bytes], "brainfrost-import-smoke.zip", {
      type: "application/zip",
    });

    const files = await readZipTextFiles(file);
    const paths = files.map((entry) => entry.path);

    expect(files).toHaveLength(7);
    expect(paths).toContain("README.md");
    expect(paths).toContain("docs/pipelines.md");
    expect(paths).not.toContain(".env.example");
    expect(files.every((entry) => entry.text.trim().length > 0)).toBe(true);
  });
});
