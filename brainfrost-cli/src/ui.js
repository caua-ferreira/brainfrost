const enabled = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code) => (text) => (enabled ? `\u001b[${code}m${text}\u001b[0m` : text);

export const c = {
  ice: wrap("96"),
  deep: wrap("94"),
  dim: wrap("90"),
  white: wrap("97"),
  ok: wrap("92"),
  warn: wrap("93"),
  bad: wrap("91"),
  bold: wrap("1"),
};

export const say = (msg = "") => process.stdout.write(msg + "\n");
export const flake = (msg) => say(`${c.ice("❄")}  ${msg}`);
export const ok = (msg) => say(`${c.ok("✓")}  ${msg}`);
export const warn = (msg) => say(`${c.warn("!")}  ${msg}`);
export const fail = (msg) => process.stderr.write(`${c.bad("✕")}  ${msg}\n`);

/** Parser de argv: separa flags (--x, --x=valor, --x valor) dos posicionais. */
export function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [name, inline] = arg.slice(2).split("=");
    const key = name.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    if (inline !== undefined) {
      flags[key] = inline;
    } else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      flags[key] = argv[i + 1];
      i += 1;
    } else {
      flags[key] = true;
    }
  }
  return { flags, positional };
}

export function list(flag) {
  if (!flag || flag === true) return null;
  return String(flag)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
