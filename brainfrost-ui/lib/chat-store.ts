import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatConfig, ChatMessage } from "./chat-client";

export interface ChatSession {
  id: string;
  configLabel: string;
  /** Camadas usadas no CONTEXTO inicial; null = cofre inteiro. */
  layers: string[] | null;
  startedAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface ChatState {
  configs: ChatConfig[];
  activeConfigLabel: string | null;
  sessions: ChatSession[];
  activeSessionId: string | null;

  saveConfig: (config: ChatConfig) => void;
  deleteConfig: (label: string) => void;
  setActiveConfig: (label: string | null) => void;

  newSession: (configLabel: string, layers: string[] | null) => string;
  appendMessage: (sessionId: string, msg: ChatMessage) => void;
  deleteSession: (sessionId: string) => void;
  setActiveSession: (id: string | null) => void;
  clearAllSessions: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      configs: [],
      activeConfigLabel: null,
      sessions: [],
      activeSessionId: null,

      saveConfig: (config) =>
        set((state) => {
          const others = state.configs.filter((c) => c.label !== config.label);
          return {
            configs: [...others, config],
            activeConfigLabel: state.activeConfigLabel ?? config.label,
          };
        }),

      deleteConfig: (label) =>
        set((state) => ({
          configs: state.configs.filter((c) => c.label !== label),
          activeConfigLabel:
            state.activeConfigLabel === label ? null : state.activeConfigLabel,
        })),

      setActiveConfig: (label) => set({ activeConfigLabel: label }),

      newSession: (configLabel, layers) => {
        const id = new Date().toISOString().replace(/[:.]/g, "-");
        set((state) => ({
          sessions: [
            {
              id,
              configLabel,
              layers,
              startedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: [],
            },
            ...state.sessions,
          ],
          activeSessionId: id,
        }));
        return id;
      },

      appendMessage: (sessionId, msg) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, msg], updatedAt: new Date().toISOString() }
              : s
          ),
        })),

      deleteSession: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId,
        })),

      setActiveSession: (id) => set({ activeSessionId: id }),

      clearAllSessions: () => set({ sessions: [], activeSessionId: null }),
    }),
    {
      name: "brainfrost.chat.v1",
      // Chaves de API vivem só aqui; nunca sobem pro repo, nunca vão pro backend.
    }
  )
);

export function getActiveConfig(): ChatConfig | null {
  const { configs, activeConfigLabel } = useChatStore.getState();
  return configs.find((c) => c.label === activeConfigLabel) ?? null;
}

export function getActiveSession(): ChatSession | null {
  const { sessions, activeSessionId } = useChatStore.getState();
  return sessions.find((s) => s.id === activeSessionId) ?? null;
}
