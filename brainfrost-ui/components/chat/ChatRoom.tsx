"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Bot, Loader2, MessagesSquare, Plus, Send, Sparkles, User } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfigDrawer } from "./ConfigDrawer";
import { ProviderPicker } from "./ProviderPicker";
import { LOCAL_CHAT_CONFIG, sendChat, type ChatMessage, type ProviderPreset } from "@/lib/chat-client";
import { useChatStore, type ChatSession } from "@/lib/chat-store";
import { buildChatFollowup, buildChatOpener } from "@/lib/chat-prompt";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import type { Note } from "@/lib/types";

interface Props {
  notes: Note[];
}

export default function ChatRoom({ notes }: Props) {
  const router = useRouter();
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

  const availableConfigs = useMemo(
    () => [LOCAL_CHAT_CONFIG, ...configs.filter((config) => config.label !== LOCAL_CHAT_CONFIG.label)],
    [configs]
  );

  const activeConfig = useMemo(
    () => availableConfigs.find((c) => c.label === activeConfigLabel) ?? LOCAL_CHAT_CONFIG,
    [availableConfigs, activeConfigLabel]
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
    const userContent = isFirst
      ? buildChatOpener(notes, currentSession.layers, question)
      : buildChatFollowup(notes, question);
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
          <Image
            src="/mascot/yeti-video-ezgif.com-crop.gif"
            alt="Yeti digitando"
            width={36}
            height={36}
            unoptimized
            className="h-8 w-8 rounded-full object-contain"
          />
          <button
            onClick={() => router.push("/painel")}
            className="flex h-8 items-center gap-1 rounded-full border px-2.5 font-mono text-[11px]"
            style={{ borderColor: c.borderSoft, color: c.dim }}
            title="Voltar ao painel"
          >
            <ArrowLeft className="h-3 w-3" /> painel
          </button>
          <select
            value={activeConfig.label}
            onChange={(e) => {
              const label = e.target.value || null;
              setActiveConfig(label);
              const nextSession = sessions.find((item) => item.configLabel === label);
              setActiveSession(nextSession?.id ?? null);
            }}
            className="min-w-0 rounded-md border bg-transparent px-2 py-1.5 text-[13px] outline-none focus:ring-2"
            style={{ color: c.text, borderColor: c.borderSoft, background: c.bgSoft }}
          >
            {availableConfigs.map((cfg) => (
              <option key={cfg.label} value={cfg.label} style={{ background: c.card, color: c.text }}>
                {cfg.label}
              </option>
            ))}
          </select>
          {sessions.length > 0 && (
            <select
              value={activeSessionId ?? ""}
              onChange={(e) => {
                const nextSession = sessions.find((item) => item.id === e.target.value);
                setActiveSession(nextSession?.id ?? null);
                if (nextSession) setActiveConfig(nextSession.configLabel);
              }}
              className="max-w-[150px] rounded-md border bg-transparent px-2 py-1.5 text-[11px] outline-none md:hidden"
              style={{ color: c.text, borderColor: c.borderSoft, background: c.bgSoft }}
              aria-label="Selecionar conversa"
            >
              <option value="" style={{ background: c.card, color: c.text }}>
                nova conversa
              </option>
              {sessions.map((item) => (
                <option key={item.id} value={item.id} style={{ background: c.card, color: c.text }}>
                  {sessionTitle(item)}
                </option>
              ))}
            </select>
          )}
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

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Histórico de conversas */}
        <aside
          className="hidden w-64 shrink-0 flex-col border-r md:flex"
          style={{ background: c.card + "45", borderColor: c.borderSoft }}
        >
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3" style={{ borderColor: c.borderSoft }}>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: c.dim }}>
                histórico
              </p>
              <p className="mt-1 text-[13px] font-semibold" style={{ color: c.text }}>
                Conversas
              </p>
            </div>
            <button
              onClick={() => setActiveSession(null)}
              className="flex h-7 items-center gap-1 rounded-full border px-2.5 font-mono text-[10px]"
              style={{ borderColor: c.borderSoft, color: c.accent }}
              title="Começar uma nova conversa"
            >
              <Plus className="h-3 w-3" /> nova
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {sessions.length === 0 ? (
              <p className="px-2 py-4 text-[12px] leading-relaxed" style={{ color: c.dim }}>
                Suas conversas aparecerão aqui.
              </p>
            ) : (
              sessions.map((item) => {
                const active = item.id === activeSessionId;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSession(item.id);
                      setActiveConfig(item.configLabel);
                    }}
                    className="w-full rounded-lg border px-3 py-2.5 text-left transition-colors"
                    style={{
                      background: active ? `${c.accent}14` : "transparent",
                      borderColor: active ? `${c.accent}55` : "transparent",
                    }}
                  >
                    <p className="truncate text-[12px] font-medium" style={{ color: active ? c.text : c.dim }}>
                      {sessionTitle(item)}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px]" style={{ color: c.dim }}>
                      <span className="truncate">{item.configLabel}</span>
                      <span className="shrink-0">{formatSessionDate(item.updatedAt)}</span>
                    </div>
                    <p className="mt-1 font-mono text-[10px]" style={{ color: c.dim }}>
                      {Math.ceil(item.messages.length / 2)} {Math.ceil(item.messages.length / 2) === 1 ? "troca" : "trocas"}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Área de mensagens */}
          <div ref={scroller} className="relative flex-1 overflow-y-auto px-4 py-6 md:px-6">
            <div className="mx-auto max-w-3xl space-y-4">
              {!session || session.messages.length === 0 ? (
                <div className="pt-16">
                  <EmptyState
                    title="Faça sua primeira pergunta"
                    description="A primeira mensagem leva o cérebro inteiro como contexto. As seguintes reenviam as regras relevantes + histórico."
                  />
                </div>
              ) : (
                session.messages.map((msg, i) => (
                  <Message key={i} msg={msg} c={c} />
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
            className="relative shrink-0 border-t p-3 md:px-6 md:py-4"
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
                    : "primeira pergunta (o cérebro inteiro entra no contexto)"
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

function Message({ msg, c }: { msg: ChatMessage; c: ReturnType<typeof palette> }) {
  const isUser = msg.role === "user";
  const display = isUser ? extractQuestion(msg.content) : msg.content;

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

function sessionTitle(session: ChatSession): string {
  const firstQuestion = session.messages.find((message) => message.role === "user");
  const title = firstQuestion ? extractQuestion(firstQuestion.content).replace(/\s+/g, " ").trim() : "Nova conversa";
  return title.length > 52 ? `${title.slice(0, 52).trimEnd()}…` : title;
}

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value)).replace(".", "");
}

function extractQuestion(fullPrompt: string): string {
  const marker = "## PERGUNTA";
  const idx = fullPrompt.indexOf(marker);
  if (idx === -1) return fullPrompt;
  return fullPrompt.slice(idx + marker.length).trim();
}
