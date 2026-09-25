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
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import type { Note } from "@/lib/types";

interface Props {
  notes: Note[];
}

export default function ChatRoom({ notes }: Props) {
  const theme = useSaas((s) => s.theme);
  const c = palette(theme);

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

  // Onboarding: nenhuma config → picker no meio, com hero da linguagem nova.
  if (configs.length === 0) {
    return (
      <div className="relative h-full overflow-y-auto overflow-x-hidden" style={{ background: c.bg }}>
        <div
          className="pointer-events-none absolute -right-32 top-0 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: c.accent, opacity: 0.10 }}
        />
        <div
          className="pointer-events-none absolute -left-32 top-72 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: c.aurora, opacity: 0.07 }}
        />

        <div className="relative mx-auto max-w-4xl space-y-8 px-6 py-16 md:py-20">
          <div>
            <h1
              className="text-[42px] font-semibold leading-[1.02] tracking-tight md:text-[56px]"
              style={{ color: c.text }}
            >
              Converse com o cofre
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(to right, ${c.accent}, ${c.aurora})` }}
              >
                em qualquer IA.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed" style={{ color: c.dim }}>
              Escolha um provedor abaixo e cole sua chave. Ela fica só no seu navegador — o
              BrainFrost nunca vê. A primeira pergunta leva o cofre inteiro como contexto.
            </p>
          </div>
          <ProviderPicker onPick={setDrawerPreset} />
        </div>

        <ConfigDrawer
          open={drawerPreset !== null}
          onOpenChange={(o) => !o && setDrawerPreset(null)}
          preset={drawerPreset}
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden" style={{ background: c.bg }}>
      <div
        className="pointer-events-none absolute -right-32 top-0 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: c.accent, opacity: 0.08 }}
      />

      {/* Header do chat */}
      <div
        className="relative z-10 flex shrink-0 items-center justify-between border-b px-4 py-3 md:px-6"
        style={{ background: c.card + "80", borderColor: c.borderSoft }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <MessagesSquare className="h-4 w-4 shrink-0" style={{ color: c.accent }} />
          <select
            value={activeConfigLabel ?? ""}
            onChange={(e) => setActiveConfig(e.target.value || null)}
            className="min-w-0 rounded-md border bg-transparent px-2 py-1.5 text-[13px] outline-none focus:ring-2"
            style={{ color: c.text, borderColor: c.borderSoft, background: c.bgSoft }}
          >
            {configs.map((cfg) => (
              <option key={cfg.label} value={cfg.label} style={{ background: c.card, color: c.text }}>
                {cfg.label}
              </option>
            ))}
          </select>
          {activeConfig && (
            <span className="hidden truncate font-mono text-[11px] sm:inline" style={{ color: c.dim }}>
              {activeConfig.model}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {session && session.messages.length > 0 && (
            <button
              onClick={() => setActiveSession(null)}
              className="flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-[11px]"
              style={{ borderColor: c.borderSoft, color: c.dim }}
              title="Nova conversa (a atual fica no histórico)"
            >
              <Plus className="h-3 w-3" /> nova
            </button>
          )}
          <button
            onClick={() => setPickerOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-[11px]"
            style={{ borderColor: c.borderSoft, color: c.dim }}
            title="Conectar outra IA"
          >
            <Sparkles className="h-3 w-3" /> conectar
          </button>
        </div>
      </div>

      {/* Área de mensagens */}
      <div ref={scroller} className="relative z-10 flex-1 overflow-y-auto px-4 py-6 md:px-6">
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
              <Message key={i} msg={msg} first={i === 0} c={c} />
            ))
          )}
          {sending && (
            <div className="flex items-center gap-2 text-xs" style={{ color: c.dim }}>
              <Loader2 className="h-3 w-3 animate-spin" />
              pensando…
            </div>
          )}
          {error && (
            <div
              className="rounded-md border p-3 text-xs"
              style={{ borderColor: "#ff6b81", background: "#ff6b8118", color: "#ff9caf" }}
            >
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div
        className="relative z-10 shrink-0 border-t p-3 md:px-6 md:py-4"
        style={{ background: c.card + "80", borderColor: c.borderSoft }}
      >
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
            className="flex-1 resize-none rounded-xl border px-4 py-3 text-[14px] outline-none placeholder:opacity-50 focus:ring-2"
            style={{ background: c.bgSoft, borderColor: c.borderSoft, color: c.text }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform hover:scale-[1.02] disabled:opacity-40"
            style={{ background: c.accent, color: c.onAccent }}
            aria-label="Enviar"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center backdrop-blur md:items-center"
          style={{ background: `${c.bg}cc` }}
          onClick={() => setPickerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border p-5 md:max-w-3xl md:rounded-2xl md:p-6"
            style={{ background: c.card, borderColor: c.border }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[17px] font-semibold" style={{ color: c.text }}>
                Conectar uma IA
              </h3>
              <button
                onClick={() => setPickerOpen(false)}
                className="rounded-md px-2 py-1 text-xs"
                style={{ color: c.dim }}
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

function Message({ msg, first, c }: { msg: ChatMessage; first: boolean; c: ReturnType<typeof palette> }) {
  const isUser = msg.role === "user";
  const display = isUser && first ? extractQuestion(msg.content) : msg.content;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: isUser ? `${c.accent}20` : `${c.aurora}20`,
          color: isUser ? c.accent : c.aurora,
        }}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className="reader max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed"
        style={{
          background: isUser ? `${c.accent}10` : c.card,
          border: isUser ? "none" : `1px solid ${c.borderSoft}`,
          color: c.text,
        }}
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
