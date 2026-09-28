"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, ChevronDown, Expand, Loader2, Send, User, X } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { useVaultSnapshot } from "@/lib/supabase/useVault";
import { buildChatOpener } from "@/lib/chat-prompt";
import { LOCAL_CHAT_CONFIG, sendChat, type ChatMessage } from "@/lib/chat-client";
import { useChatStore } from "@/lib/chat-store";

const HIDDEN_PATHS = ["/config", "/assinatura"];

export default function ChatWidget() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) return null;
  return <ChatWidgetContent />;
}

function ChatWidgetContent() {
  const router = useRouter();
  const theme = useSaas((s) => s.theme);
  const model = useSaas((s) => s.config.webLlmModel ?? LOCAL_CHAT_CONFIG.model);
  const c = palette(theme);
  const { snapshot, loading: vaultLoading } = useVaultSnapshot();
  const sessions = useChatStore((s) => s.sessions);
  const newSession = useChatStore((s) => s.newSession);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const localSession = useMemo(
    () => sessions.find((session) => session.configLabel === LOCAL_CHAT_CONFIG.label) ?? null,
    [sessions]
  );
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [localSession?.messages.length, sending]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const question = input.trim();
    setInput("");
    setError(null);
    setSending(true);
    setModelLoading(true);

    let current = localSession;
    if (!current) {
      const id = newSession(LOCAL_CHAT_CONFIG.label, null);
      current = {
        id,
        configLabel: LOCAL_CHAT_CONFIG.label,
        layers: null,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
    }

    const userContent = current.messages.length === 0
      ? buildChatOpener(snapshot?.notes ?? [], null, question)
      : question;
    const userMsg: ChatMessage = { role: "user", content: userContent };
    appendMessage(current.id, userMsg);

    try {
      const answer = await sendChat(
        { ...LOCAL_CHAT_CONFIG, model },
        [...current.messages, userMsg]
      );
      appendMessage(current.id, { role: "assistant", content: answer });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
      setModelLoading(false);
    }
  }

  function handleKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border shadow-xl transition-transform hover:scale-105 md:bottom-6 md:right-6"
        style={{ background: c.card, borderColor: `${c.accent}70`, color: c.accent }}
        title="Conversar com o cérebro local"
        aria-label="Abrir chat local"
      >
        <Image
          src="/mascot/yeti-video-ezgif.com-crop.gif"
          alt="Yeti digitando"
          width={48}
          height={48}
          unoptimized
          className="h-11 w-11 rounded-full object-contain"
        />
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
      </button>
    );
  }

  return (
    <section
      className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-3 z-40 flex h-[min(620px,calc(100dvh-92px))] w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border shadow-2xl md:bottom-6 md:right-6"
      style={{ background: c.bg, borderColor: c.border }}
      aria-label="Mini chat local"
    >
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5" style={{ background: c.card, borderColor: c.borderSoft }}>
        <Image
          src="/mascot/yeti-video-ezgif.com-crop.gif"
          alt="Yeti digitando"
          width={38}
          height={38}
          unoptimized
          className="h-9 w-9 rounded-full object-contain"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold" style={{ color: c.text }}>Cérebro local</p>
          <p className="font-mono text-[10px]" style={{ color: c.dim }}>
            {modelLoading ? "carregando modelo no navegador…" : "WebLLM · seus dados ficam aqui"}
          </p>
        </div>
        <Link
          href="/chat"
          onClick={() => setOpen(false)}
          className="rounded-md p-1.5 transition-colors hover:bg-muted"
          style={{ color: c.dim }}
          title="Abrir chat completo"
          aria-label="Abrir chat completo"
        >
          <Expand className="h-4 w-4" />
        </Link>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-muted" style={{ color: c.dim }} aria-label="Fechar mini chat">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {vaultLoading && !localSession?.messages.length && (
          <p className="py-8 text-center font-mono text-[11px]" style={{ color: c.dim }}>carregando contexto…</p>
        )}
        {!vaultLoading && !localSession?.messages.length && (
          <div className="rounded-xl border p-3 text-[12px] leading-relaxed" style={{ borderColor: c.borderSoft, color: c.dim }}>
            <p className="font-medium" style={{ color: c.text }}>Pergunte qualquer coisa ao seu cérebro.</p>
            <p className="mt-1">A primeira pergunta usa suas camadas como contexto e roda localmente.</p>
          </div>
        )}
        {localSession?.messages.map((message, index) => (
          <MiniMessage key={`${localSession.id}-${index}`} message={message} c={c} first={index === 0} />
        ))}
        {sending && (
          <div className="flex items-center gap-2 font-mono text-[11px]" style={{ color: c.dim }}>
            <Loader2 className="h-3 w-3 animate-spin" /> pensando…
          </div>
        )}
        {error && <p className="rounded-lg border p-2 text-[11px]" style={{ borderColor: "#ff6b81", color: "#c2415a" }}>{error}</p>}
      </div>

      <div className="shrink-0 border-t p-2.5" style={{ background: c.card, borderColor: c.borderSoft }}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKey}
            rows={2}
            placeholder="pergunte ao cérebro…"
            className="min-w-0 flex-1 resize-none rounded-xl border bg-transparent px-3 py-2 text-[12px] outline-none placeholder:opacity-50"
            style={{ borderColor: c.borderSoft, color: c.text }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-40"
            style={{ background: c.accent, color: c.onAccent }}
            aria-label="Enviar pergunta"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-1 font-mono text-[10px]" style={{ color: c.dim }}>
          <ChevronDown className="h-3 w-3" /> minimizar
        </button>
      </div>
    </section>
  );
}

function MiniMessage({ message, first, c }: { message: ChatMessage; first: boolean; c: ReturnType<typeof palette> }) {
  const isUser = message.role === "user";
  const display = isUser && first ? extractQuestion(message.content) : message.content;
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: isUser ? `${c.accent}20` : `${c.aurora}20`, color: isUser ? c.accent : c.aurora }}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <p className="max-w-[84%] rounded-xl px-3 py-2 text-[12px] leading-relaxed" style={{ background: isUser ? `${c.accent}10` : c.card, border: isUser ? "none" : `1px solid ${c.borderSoft}`, color: c.text }}>
        {display}
      </p>
    </div>
  );
}

function extractQuestion(fullPrompt: string) {
  const marker = "## PERGUNTA";
  const index = fullPrompt.indexOf(marker);
  return index === -1 ? fullPrompt : fullPrompt.slice(index + marker.length).trim();
}
