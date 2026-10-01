import { describe, expect, it } from "vitest";
import { googleExportUrl, htmlToReadableText, importRemoteSource, isUnsafeAddress, parseGitLabProject, parsePublicUrl } from "./remote-import";

describe("remote-import", () => {
  it("extrai conteúdo legível e remove scripts de HTML", () => {
    const result = htmlToReadableText(`
      <html><head><title>Guia &amp; padrões</title><style>.x{}</style></head>
      <body><main><h1>Arquitetura</h1><p>Use eventos.</p><script>alert('segredo')</script></main></body></html>
    `);
    expect(result.title).toBe("Guia & padrões");
    expect(result.text).toContain("Arquitetura");
    expect(result.text).toContain("Use eventos.");
    expect(result.text).not.toContain("segredo");
  });

  it("aceita somente URL HTTP(S) sem credenciais", () => {
    expect(parsePublicUrl("https://example.com/docs").hostname).toBe("example.com");
    expect(() => parsePublicUrl("file:///etc/passwd")).toThrow(/HTTP ou HTTPS/);
    expect(() => parsePublicUrl("https://user:pass@example.com")).toThrow(/HTTP ou HTTPS/);
  });

  it("bloqueia endereços locais e privados", () => {
    for (const address of ["127.0.0.1", "10.0.0.2", "100.64.0.1", "172.20.0.1", "192.168.1.1", "169.254.169.254", "198.18.0.1", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
      expect(isUnsafeAddress(address), address).toBe(true);
    }
    expect(isUnsafeAddress("8.8.8.8")).toBe(false);
    expect(isUnsafeAddress("2606:4700:4700::1111")).toBe(false);
  });

  it("normaliza links do GitLab e Google Workspace", () => {
    expect(parseGitLabProject("https://gitlab.com/grupo/subgrupo/projeto/-/tree/main/docs")).toBe("grupo/subgrupo/projeto");
    expect(googleExportUrl("https://docs.google.com/document/d/doc_123/edit").toString())
      .toBe("https://docs.google.com/document/d/doc_123/export?format=txt");
    expect(googleExportUrl("https://docs.google.com/spreadsheets/d/sheet_123/edit").toString())
      .toBe("https://docs.google.com/spreadsheets/d/sheet_123/export?format=csv");
    expect(googleExportUrl("https://drive.google.com/file/d/file_123/view").toString())
      .toBe("https://drive.google.com/uc?export=download&id=file_123");
  });

  it.runIf(process.env.RUN_LIVE_REMOTE_IMPORT === "1")("lê uma página e um projeto GitLab públicos", async () => {
    const page = await importRemoteSource("url", "https://example.com");
    expect(page.rawText).toContain("Example Domain");

    const gitlab = await importRemoteSource("gitlab", "https://gitlab.com/gitlab-org/cli");
    expect(gitlab.label).toContain("cli");
    expect(gitlab.fileCount).toBeGreaterThan(0);
    expect(gitlab.rawText).toContain("README");

    const drive = await importRemoteSource(
      "google_drive",
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
    );
    expect(drive.fileCount).toBe(1);
    expect(drive.rawText.length).toBeGreaterThan(100);
  }, 30_000);
});
