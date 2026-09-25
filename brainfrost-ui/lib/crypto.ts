import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM sobre a chave-mestra em ENCRYPTION_KEY (env server-side).
 * Cifra: [12-byte IV][16-byte tag][ciphertext].
 * Nunca chame do cliente — process.env.ENCRYPTION_KEY não existe lá.
 */

const ALG = "aes-256-gcm";

function getMasterKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY ausente ou fora do formato hex de 32 bytes (64 chars).");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): Buffer {
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

export function decrypt(buf: Buffer): string {
  const key = getMasterKey();
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
