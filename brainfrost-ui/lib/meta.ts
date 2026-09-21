import fs from "node:fs";
import path from "node:path";
import { resolveVaultDir } from "./vault";

export interface ProviderEnvVar {
  name: string;
  present: boolean;
}

export interface ProviderMeta {
  name: string;
  kind: "print" | "cmd" | "http";
  about: string | null;
  model: string | null;
  cmd: string | null;
  url: string | null;
  envVars: ProviderEnvVar[];
  custom: boolean;
}

export interface VaultMeta {
  schema: number;
  updatedAt: string;
  activeProvider: string;
  model: string | null;
  header: string | null;
  autoPull: boolean;
  autoPush: boolean;
  providers: ProviderMeta[];
}

/**
 * Lê o snapshot da config vigente no momento em que o dono rodou
 * `bfrost sync` (ou `bfrost meta`). Fica em `.brainfrost/_meta.json`
 * e nunca guarda valor de chave — só o nome da env var e se ela
 * estava setada no ambiente.
 */
export function readMeta(): VaultMeta | null {
  try {
    const file = path.join(resolveVaultDir(), "_meta.json");
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8")) as VaultMeta;
  } catch {
    return null;
  }
}
