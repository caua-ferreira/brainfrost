import { shouldSkipFile } from "./sanitize";
import type { ContextFile } from "./github";

export const LOCAL_FILE_ACCEPT =
  ".md,.mdx,.mdc,.txt,.json,.yaml,.yml,.toml,.js,.jsx,.mjs,.cjs,.ts,.tsx,.py,.sql,.css,.html,.xml,.sh,.ps1,.bat,.go,.java,.kt,.rs,.rb,.php,.vue,.svelte,Dockerfile,Makefile,README,CONTEXT,AGENTS";

const MAX_FILES = 50;
const MAX_FILE_BYTES = 60 * 1024;
const MAX_TOTAL_BYTES = 200 * 1024;
const TEXT_EXTENSIONS = new Set([
  ".md", ".mdx", ".mdc", ".txt", ".json", ".yaml", ".yml", ".toml",
  ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".sql", ".css",
  ".html", ".xml", ".sh", ".ps1", ".bat", ".go", ".java", ".kt", ".rs",
  ".rb", ".php", ".vue", ".svelte",
]);

function isTextPath(path: string) {
  if (shouldSkipFile(path)) return false;
  const name = path.split("/").at(-1)?.toLowerCase() ?? "";
  if (["dockerfile", "makefile", "readme", "context", "agents"].includes(name)) return true;
  return TEXT_EXTENSIONS.has(name.slice(name.lastIndexOf(".")));
}

function decodeText(bytes: Uint8Array) {
  return new TextDecoder("utf-8").decode(bytes);
}

async function readFileCandidates(files: Array<{ path: string; size: number; text: () => Promise<string> }>) {
  const result: ContextFile[] = [];
  let totalBytes = 0;

  for (const file of files) {
    if (result.length >= MAX_FILES || !isTextPath(file.path)) continue;
    if (file.size > MAX_FILE_BYTES || totalBytes + file.size > MAX_TOTAL_BYTES) continue;
    const text = await file.text();
    if (!text.trim()) continue;
    result.push({ path: file.path, size: text.length, text });
    totalBytes += text.length;
  }

  return result;
}

export function readLocalTextFiles(files: File[]) {
  return readFileCandidates(
    files.map((file) => ({
      path: file.webkitRelativePath || file.name,
      size: file.size,
      text: () => file.text(),
    }))
  );
}

async function inflateRaw(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Este navegador não consegue abrir ZIPs diretamente. Use Chrome ou Edge atualizado.");
  }
  const compressedBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const stream = new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEndOfCentralDirectory(view: DataView) {
  const minimumOffset = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  return -1;
}

export async function readZipTextFiles(file: File) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const endOffset = findEndOfCentralDirectory(view);
  if (endOffset < 0) throw new Error("Arquivo ZIP inválido ou corrompido.");

  const entryCount = view.getUint16(endOffset + 10, true);
  const centralOffset = view.getUint32(endOffset + 16, true);
  const decoder = new TextDecoder("utf-8");
  const candidates: Array<{ path: string; size: number; text: () => Promise<string> }> = [];
  let offset = centralOffset;

  for (let index = 0; index < entryCount && index < MAX_FILES * 4; index++) {
    if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("Estrutura interna do ZIP inválida.");
    }

    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength));
    offset += 46 + nameLength + extraLength + commentLength;

    if (name.endsWith("/") || (flags & 1) !== 0 || !isTextPath(name)) continue;
    if (![0, 8].includes(method) || uncompressedSize > MAX_FILE_BYTES) continue;
    if (localOffset + 30 > view.byteLength || view.getUint32(localOffset, true) !== 0x04034b50) {
      continue;
    }

    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > view.byteLength) continue;

    const compressed = new Uint8Array(buffer, dataOffset, compressedSize);
    candidates.push({
      path: name,
      size: uncompressedSize,
      text: async () => decodeText(method === 0 ? compressed : await inflateRaw(compressed)),
    });
  }

  const files = await readFileCandidates(candidates);
  if (files.length === 0) {
    throw new Error("Nenhum arquivo de texto compatível foi encontrado no ZIP.");
  }
  return files;
}
