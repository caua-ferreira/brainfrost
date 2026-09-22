"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Cog, Loader2, MessagesSquare, Plus, Send, User } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfigDrawer } from "./ConfigDrawer";
import { sendChat, type ChatMessage } from "@/lib/chat-client";
import { useChatStore } from "@/lib/chat-store";
import { buildChatOpener } from "@/lib/chat-prompt";
import type { Note } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  notes: Note[];
}

export default function ChatRoom({ notes }: Props) {
  const configs = useChatStore((s) => s.configs);
  const activeConfigLabel = useChatStore((s) => s.activeConfigLabel);
  const setActiveConfig = useChatStore((s) => s.setActiveConfig);
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const setActiveSession = useChatStore((s) => s.setActiveSession);
  const newSession = useChatStore((s) => s.newSession);
  const appendMessage = useChatStore((s) => s.appendMessage);

  const activeConfig = useMemo(
    () => configs.find((c) => c.label === activeConfigLabel) ?? null,
    [configs, activeConfigLabel]
  );
  const session = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const [configOpen, setConfigOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Segue o histórico rolando ao acrescentar mensagem.
  useEffect(() => {
    if (scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [session?.messages.length, sending]);

  async function handleSend() {
    if (!input.trim() || !activeConfig || sending) return;
    const question = input.trim();
    setInput("");
    setError(null);
    setSending(true);

    let currentSession = session;
    // Nova sessão on-demand na primeira mensagem — a primeira user leva o CONTEXTO.
    if (!currentSession) {
      const id = newSession(activeConfig.label, null);
      currentSession = {
        id,
        configLabel: activeConfig.label,
        layers: null,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
    }

    const isFirst = currentSession.messages.length === 0;
    const userContent = isFirst ? buildChatOpener(notes, currentSession.layers, question) : question;
    const userMsg: ChatMessage = { role: "user", content: userContent };
    appendMessage(currentSession.id, userMsg);

    try {
      const answer = await sendChat(activeConfig, [...currentSession.messages, userMsg]);
      appendMessage(currentSession.id, { role: "assistant", content: answer });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Sem config alguma: onboarding.
  if (configs.length === 0) {
    return (
      <>
        <div className="h-full overflow-auto p-6">
          <EmptyState
            title="Conecte sua LLM"
            description="Sua chave fica só no browser deste dispositivo — nada passa pelo backend do BrainFrost. OpenRouter é a opção mais simples: uma chave só e você fala com Claude, GPT ou Llama por dentro do site."
            action={
              <button
                onClick={() => setConfigOpen(true)}
                className="rounded-md border border-glow/40 bg-glow/10 px-3 py-2 text-xs text-arctic transition-colors hover:border-glow/70"
              >
                conectar sua LLM
              </button>
            }
          />
        </div>
        <ConfigDrawer open={configOpen} onOpenChange={setConfigOpen} />
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-4 py-2 hairline md:px-6">
        <div className="flex items-center gap-2 text-sm">
          <MessagesSquare className="h-4 w-4 text-glow" />
          <select
            value={activeConfigLabel ?? ""}
            onChange={(e) => setActiveConfig(e.target.value || null)}
            className="rounded-md border border-glow/15 bg-abyss/60 px-2 py-1 text-xs text-arctic focus:border-glow/50 focus:outline-none"
          >
            {configs.map((c) => (
              <option key={c.label} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
          {activeConfig && (
            <span className="hidden font-mono text-[11px] text-mute sm:inline">
              {activeConfig.model}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {session && session.messages.length > 0 && (
            <button
              onClick={() => setActiveSession(null)}
              className="flex items-center gap-1.5 rounded-md border border-glow/20 px-2 py-1 font-mono text-[11px] text-mute transition-colors hover:border-glow/50 hover:text-arctic"
              title="Nova conversa (a atual fica no histórico)"
            >
              <Plus className="h-3 w-3" /> nova
            </button>
          )}
          <button
            onClick={() => setConfigOpen(true)}
            className="rounded-md p-1.5 text-mute transition-colors hover:text-arctic"
            aria-label="Configurações"
            title="Configurações"
          >
            <Cog className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {!session || session.messages.length === 0 ? (
            <div className="pt-16">
              <EmptyState
                title="Faça sua primeira pergunta"
                description="A primeira mensagem leva o cofre inteiro como contexto. As seguintes só levam a pergunta + histórico — sua conversa continua sem re-enviar tudo."
              />
            </div>
          ) : (
            session.messages.map((msg, i) => (
              <Message key={i} msg={msg} first={i === 0} />
            ))
          )}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-mute">
              <Loader2 className="h-3 w-3 animate-spin" />
              pensando…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t bg-card/40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] hairline md:px-6 md:py-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              session && session.messages.length > 0
                ? "continue a conversa (Enter envia, Shift+Enter quebra linha)"
                : "primeira pergunta (o cofre inteiro entra no contexto)"
            }
            rows={2}
            className="flex-1 resize-none rounded-lg border border-glow/20 bg-abyss/60 px-3 py-2 text-sm text-arctic placeholder:text-mute/60 focus:border-glow/50 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-glow/40 bg-glow/10 text-arctic transition-colors hover:border-glow/70 disabled:opacity-40"
            aria-label="Enviar"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <ConfigDrawer open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}

function Message({ msg, first }: { msg: ChatMessage; first: boolean }) {
  const isUser = msg.role === "user";
  // A primeira mensagem do usuário carrega o CONTEXTO inteiro — mostrar tudo
  // polui a UI. Se detectarmos o cabeçalho conhecido, mostramos só a pergunta.
  const display = isUser && first ? extractQuestion(msg.content) : msg.content;

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          isUser ? "bg-glow/15 text-glow" : "bg-aurora/15 text-aurora"
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          "reader max-w-[85%] rounded-lg px-4 py-3 text-sm",
          isUser ? "bg-rift/40 text-arctic" : "border border-glow/15 bg-card/60"
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{display}</ReactMarkdown>
      </div>
    </div>
  );
}

function extractQuestion(fullPrompt: string): string {
  const marker = "## PERGUNTA";
  const idx = fullPrompt.indexOf(marker);
  if (idx === -1) return fullPrompt;
  return fullPrompt.slice(idx + marker.length).trim();
}
