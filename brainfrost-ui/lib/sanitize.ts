/**
 * Sanitiza texto antes de mandar pro LLM.
 *
 * Rung 1: cortar arquivos inteiros conhecidos como sensíveis (.env, chaves, credenciais).
 * Rung 2: dentro do que sobrou, redigir padrões de token/segredo/PII com marcador `[REDACTED]`.
 *
 * Não pretende ser à prova de exfiltração — é a primeira linha, não a única.
 */

interface Redaction {
  pattern: string;
  count: number;
}

export interface SanitizeResult {
  cleanText: string;
  redactions: Redaction[];
  bytesIn: number;
  bytesOut: number;
}

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "AWS access key",           regex: /AKIA[0-9A-Z]{16}/g },
  { name: "GitHub token",             regex: /gh[oprsu]_[A-Za-z0-9]{16,}/g },
  { name: "OpenAI / Anthropic key",   regex: /sk-(?:ant-)?[A-Za-z0-9_-]{20,}/g },
  { name: "Google API key",           regex: /AIza[0-9A-Za-z_-]{35}/g },
  { name: "Slack token",              regex: /xox[baprs]-[0-9A-Za-z-]{10,}/g },
  { name: "JWT",                      regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: "PEM private key block",    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { name: "Connection string senha",  regex: /(postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^:\s]+:[^@\s]+@[^\s"']+/gi },
  { name: "Bearer token em cabeçalho",regex: /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{20,}/g },
];

const PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "Email",  regex: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
  { name: "CPF",    regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g },
  { name: "CNPJ",   regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g },
  { name: "Fone BR",regex: /\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g },
];

const DROP_LINES: RegExp[] = [
  /^\s*[A-Z_]+_(?:KEY|SECRET|TOKEN|PASSWORD|PWD)\s*=\s*.+$/gm,
  /^\s*(?:process\.env|import\.meta\.env)\.[A-Z_]+\s*=.*$/gm,
];

/** Padrões de nome de arquivo que devem ser IGNORADOS por completo. */
export const FILE_DENYLIST: RegExp[] = [
  /(^|\/)\.env(\.|$)/i,
  /(^|\/)id_rsa/i,
  /\.(pem|key|p12|pfx|jks|keystore)$/i,
  /(^|\/)credentials\.json$/i,
  /(^|\/)service-account.*\.json$/i,
  /(^|\/)secrets?\.(?:yaml|yml|json|toml|env)$/i,
  /(^|\/)\.git\//,
  /(^|\/)node_modules\//,
  /\.(png|jpe?g|gif|webp|svg|pdf|mp[34]|wav|zip|tar\.gz|tgz|exe|dll|so|dylib|bin)$/i,
];

export function shouldSkipFile(path: string): boolean {
  return FILE_DENYLIST.some((r) => r.test(path));
}

const ALL_PATTERNS: Array<{ name: string; regex: RegExp; replacement: string }> = [
  ...DROP_LINES.map((regex) => ({
    name: "env assignment",
    regex,
    replacement: "// [REDACTED env assignment]",
  })),
  ...SECRET_PATTERNS.map(({ name, regex }) => ({ name, regex, replacement: `[REDACTED ${name}]` })),
  ...PII_PATTERNS.map(({ name, regex }) => ({ name, regex, replacement: `[REDACTED ${name}]` })),
];

export function sanitize(input: string): SanitizeResult {
  const bytesIn = input.length;
  const redactions: Redaction[] = [];
  let cleaned = input;

  for (const { name, regex, replacement } of ALL_PATTERNS) {
    let hits = 0;
    cleaned = cleaned.replace(regex, () => {
      hits++;
      return replacement;
    });
    if (hits > 0) redactions.push({ pattern: name, count: hits });
  }

  return {
    cleanText: cleaned,
    redactions,
    bytesIn,
    bytesOut: cleaned.length,
  };
}
