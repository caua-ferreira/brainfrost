"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Loader2, MessagesSquare, Plus, Send, Sparkles, User } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfigDrawer } from "./ConfigDrawer";
import { ProviderPicker } from "./ProviderPicker";
import { sendChat, type ChatMessage, type ProviderPreset } from "@/lib/chat-client";
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

  const [drawerPreset, setDrawerPreset] = useState<ProviderPreset | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

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

  // Onboarding: nenhuma config → picker grande no meio da tela.
  if (configs.length === 0) {
    return (
      <>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-4xl space-y-6 p-5 md:p-8">
            <div className="space-y-2 text-center">
              <div aria-hidden className="text-5xl text-glow">❄</div>
              <h2 className="text-2xl font-semibold text-arctic md:text-xl">
                Conecte uma IA
              </h2>
              <p className="mx-auto max-w-md text-[15px] text-mute md:text-sm">
                Escolha um provedor abaixo e cole sua chave. Ela fica só no
                seu navegador — o BrainFrost nunca vê.
              </p>
            </div>
            <ProviderPicker onPick={setDrawerPreset} />
          </div>
        </div>
        <ConfigDrawer
          open={drawerPreset !== null}
          onOpenChange={(o) => !o && setDrawerPreset(null)}
          preset={drawerPreset}
        />
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-4 py-2.5 hairline md:px-6">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <MessagesSquare className="h-4 w-4 shrink-0 text-glow" />
          <select
            value={activeConfigLabel ?? ""}
            onChange={(e) => setActiveConfig(e.target.value || null)}
            className="min-w-0 rounded-md border border-glow/15 bg-abyss/60 px-2 py-1.5 text-[13px] text-arctic focus:border-glow/50 focus:outline-none"
          >
            {configs.map((c) => (
              <option key={c.label} value={c.label}>
                {c.label}
              </option>
            ))}
          </select>
          {activeConfig && (
            <span className="hidden truncate font-mono text-[11px] text-mute sm:inline">
              {activeConfig.model}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {session && session.messages.length > 0 && (
            <button
              onClick={() => setActiveSession(null)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-glow/20 px-3 font-mono text-[11px] text-mute transition-colors active:bg-rift/50 active:text-arctic md:h-7 md:rounded-md md:px-2 md:hover:border-glow/50 md:hover:text-arctic"
              title="Nova conversa (a atual fica no histórico)"
            >
              <Plus className="h-3.5 w-3.5 md:h-3 md:w-3" /> nova
            </button>
          )}
          <button
            onClick={() => setPickerOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full border border-glow/20 px-3 font-mono text-[11px] text-mute transition-colors active:bg-rift/50 active:text-arctic md:h-7 md:rounded-md md:px-2 md:hover:border-glow/50 md:hover:text-arctic"
            title="Conectar outra IA"
          >
            <Sparkles className="h-3.5 w-3.5 md:h-3 md:w-3" /> conectar
          </button>
        </div>
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {!session || session.messages.length === 0 ? (
            <div className="pt-16">
              <EmptyState
                title="Faça sua primeira pergunta"
                description="A primeira mensagem leva o cofre inteiro como contexto. As seguintes só mandam a pergunta + histórico."
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

      <div className="shrink-0 border-t bg-card/40 p-3 hairline md:px-6 md:py-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              session && session.messages.length > 0
                ? "continue a conversa"
                : "primeira pergunta (o cofre inteiro entra no contexto)"
            }
            rows={2}
            className="flex-1 resize-none rounded-xl border border-glow/20 bg-abyss/60 px-4 py-3 text-[15px] text-arctic placeholder:text-mute/60 focus:border-glow/50 focus:outline-none md:rounded-lg md:px-3 md:py-2 md:text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-glow/40 bg-glow/10 text-arctic transition-colors active:bg-glow/25 disabled:opacity-40 md:h-11 md:w-11 md:rounded-lg md:hover:border-glow/70"
            aria-label="Enviar"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin md:h-4 md:w-4" /> : <Send className="h-5 w-5 md:h-4 md:w-4" />}
          </button>
        </div>
      </div>

      {/* Modal "conectar outra IA" com o picker inteiro */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-abyss/80 backdrop-blur md:items-center"
          onClick={() => setPickerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-glow/20 bg-card p-5 md:max-w-3xl md:rounded-xl md:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-arctic">Conectar uma IA</h3>
              <button
                onClick={() => setPickerOpen(false)}
                className="rounded-md px-2 py-1 text-xs text-mute hover:text-arctic"
              >
                fechar
              </button>
            </div>
            <ProviderPicker
              onPick={(preset) => {
                setPickerOpen(false);
                setDrawerPreset(preset);
              }}
            />
          </div>
        </div>
      )}

      <ConfigDrawer
        open={drawerPreset !== null}
        onOpenChange={(o) => !o && setDrawerPreset(null)}
        preset={drawerPreset}
      />
    </div>
  );
}

function Message({ msg, first }: { msg: ChatMessage; first: boolean }) {
  const isUser = msg.role === "user";
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
          "reader max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed md:rounded-lg md:text-sm",
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
