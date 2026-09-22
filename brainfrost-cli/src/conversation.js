import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const HOME_DIR = path.join(os.homedir(), ".brainfrost");
const CONVO_FILE = path.join(HOME_DIR, "conversation.json");

/**
 * Estado da conversa vive fora do cofre — é histórico de troca, não
 * conhecimento. `~/.brainfrost/conversation.json` fica na home do usuário
 * pra não misturar com o repositório versionado.
 */
export function loadConversation() {
  if (!fs.existsSync(CONVO_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(CONVO_FILE, "utf8"));
  } catch {
    return null;
  }
}

export function saveConversation(convo) {
  if (!fs.existsSync(HOME_DIR)) fs.mkdirSync(HOME_DIR, { recursive: true });
  fs.writeFileSync(CONVO_FILE, JSON.stringify(convo, null, 2) + "\n", "utf8");
}

export function newConversation(provider, model) {
  return {
    id: new Date().toISOString().replace(/[:.]/g, "-"),
    provider,
    model: model ?? null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
}

export function appendTurn(convo, userContent, assistantContent) {
  convo.messages.push({ role: "user", content: userContent });
  if (assistantContent != null) {
    convo.messages.push({ role: "assistant", content: assistantContent });
  }
  convo.updatedAt = new Date().toISOString();
  return convo;
}

export function clearConversation() {
  if (fs.existsSync(CONVO_FILE)) fs.unlinkSync(CONVO_FILE);
}

export { CONVO_FILE };
