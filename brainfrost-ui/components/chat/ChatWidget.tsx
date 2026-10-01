"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Expand, Loader2, Send, X } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { useVaultSnapshot } from "@/lib/supabase/useVault";
import { buildChatFollowup, buildChatOpener } from "@/lib/chat-prompt";
import { LOCAL_CHAT_CONFIG, sendChat, type ChatConfig, type ChatMessage } from "@/lib/chat-client";
import { useChatStore } from "@/lib/chat-store";
import { useSession } from "@/components/saas/SessionProvider";

const HIDDEN_PATHS = ["/config", "/assinatura"];

export default function ChatWidget() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) return null;
  return <ChatWidgetContent />;
}

function ChatWidgetContent() {
  const router = useRouter();
  const theme = useSaas((s) => s.theme);
  const localModel = useSaas((s) => s.config.webLlmModel ?? LOCAL_CHAT_CONFIG.model);
  const c = palette(theme);
  const { snapshot, loading: vaultLoading } = useVaultSnapshot();
  const { session: authSession } = useSession();
  const configs = useChatStore((s) => s.configs);
  const activeConfigLabel = useChatStore((s) => s.activeConfigLabel);
  const setActiveConfig = useChatStore((s) => s.setActiveConfig);
  const sessions = useChatStore((s) => s.sessions);
  const newSession = useChatStore((s) => s.newSession);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const availableConfigs = useMemo(
    () => [LOCAL_CHAT_CONFIG, ...configs.filter((config) => config.label !== LOCAL_CHAT_CONFIG.label)],
    [configs]
  );
  const activeConfig = useMemo(
    () => availableConfigs.find((config) => config.label === activeConfigLabel) ?? LOCAL_CHAT_CONFIG,
    [availableConfigs, activeConfigLabel]
  );
  const activeSession = useMemo(
    () => sessions.find((session) => session.configLabel === activeConfig.label) ?? null,
    [sessions, activeConfig.label]
  );
  const userProfile = useMemo(
    () => buildUserProfile(authSession?.user),
    [authSession]
  );
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [activeSession?.messages.length, sending]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const question = input.trim();
    setInput("");
    setError(null);
    setSending(true);
    const requestConfig: ChatConfig = activeConfig.api === "webllm"
      ? { ...activeConfig, model: localModel }
      : activeConfig;
    setModelLoading(requestConfig.api === "webllm");

    let current = activeSession;
    if (!current) {
      const id = newSession(requestConfig.label, null);
      current = {
        id,
        configLabel: requestConfig.label,
        layers: null,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
    }

    const userContent = current.messages.length === 0
      ? buildChatOpener(snapshot?.notes ?? [], null, question)
      : buildChatFollowup(snapshot?.notes ?? [], question);
    const userMsg: ChatMessage = { role: "user", content: userContent };
    appendMessage(current.id, userMsg);

    try {
      const answer = await sendChat(
        requestConfig,
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
        title="Conversar com o cérebro"
        aria-label="Abrir chat"
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
      aria-label="Mini chat"
    >
      <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5" style={{ background: c.card, borderColor: c.borderSoft }}>
        <Image
          src="/mascot/yeti-video-ezgif.com-crop.gif"
          alt="Yeti respondendo"
          width={38}
          height={38}
          unoptimized
          className="h-9 w-9 rounded-full object-contain"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold" style={{ color: c.text }}>{activeConfig.label}</p>
          <p className="font-mono text-[10px]" style={{ color: c.dim }}>
            {modelLoading
              ? "carregando modelo no navegador…"
              : activeConfig.api === "webllm"
                ? "WebLLM · seus dados ficam aqui"
                : activeConfig.model}
          </p>
        </div>
        <select
          value={activeConfig.label}
          onChange={(event) => {
            setError(null);
            setActiveConfig(event.target.value);
          }}
          disabled={sending}
          className="max-w-[120px] rounded-md border bg-transparent px-1.5 py-1 text-[10px] outline-none disabled:opacity-50"
          style={{ color: c.text, borderColor: c.borderSoft, background: c.bgSoft }}
          aria-label="Escolher LLM"
          title="Escolher LLM"
        >
          {availableConfigs.map((config) => (
            <option key={config.label} value={config.label} style={{ background: c.card, color: c.text }}>
              {config.label}
            </option>
          ))}
        </select>
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
        {vaultLoading && !activeSession?.messages.length && (
          <p className="py-8 text-center font-mono text-[11px]" style={{ color: c.dim }}>carregando contexto…</p>
        )}
        {!vaultLoading && !activeSession?.messages.length && (
          <div className="rounded-xl border p-3 text-[12px] leading-relaxed" style={{ borderColor: c.borderSoft, color: c.dim }}>
            <p className="font-medium" style={{ color: c.text }}>Pergunte qualquer coisa ao seu cérebro.</p>
            <p className="mt-1">
              A primeira pergunta usa suas memórias como contexto e será respondida por {activeConfig.label}.
            </p>
          </div>
        )}
        {activeSession?.messages.map((message, index) => (
              <MiniMessage key={`${activeSession.id}-${index}`} message={message} c={c} userProfile={userProfile} />
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

interface UserProfile {
  avatar: string | null;
  initials: string;
}

function MiniMessage({
  message,
  c,
  userProfile,
}: {
  message: ChatMessage;
  c: ReturnType<typeof palette>;
  userProfile: UserProfile;
}) {
  const isUser = message.role === "user";
  const display = isUser ? extractQuestion(message.content) : message.content;
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ background: isUser ? `${c.accent}20` : `${c.aurora}20`, color: isUser ? c.accent : c.aurora }}>
        {isUser ? (
          userProfile.avatar ? (
            <Image src={userProfile.avatar} alt="Você" fill sizes="28px" className="object-cover" />
          ) : (
            <span className="font-mono text-[9px] font-semibold">{userProfile.initials}</span>
          )
        ) : (
          <Image
            src="/mascot/yeti-video-ezgif.com-crop.gif"
            alt="Yeti respondendo"
            width={28}
            height={28}
            unoptimized
            className="h-7 w-7 object-contain"
          />
        )}
      </div>
      <p className="max-w-[84%] rounded-xl px-3 py-2 text-[12px] leading-relaxed" style={{ background: isUser ? `${c.accent}10` : c.card, border: isUser ? "none" : `1px solid ${c.borderSoft}`, color: c.text }}>
        {display}
      </p>
    </div>
  );
}

function buildUserProfile(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{ identity_data?: Record<string, unknown> }>;
} | undefined): UserProfile {
  const metadata = user?.user_metadata ?? {};
  const identity = user?.identities?.[0]?.identity_data ?? {};
  const avatar =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.picture === "string" && metadata.picture) ||
    (typeof identity.avatar_url === "string" && identity.avatar_url) ||
    (typeof identity.picture === "string" && identity.picture) ||
    null;
  const name =
    (typeof metadata.display_name === "string" && metadata.display_name) ||
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    (typeof identity.full_name === "string" && identity.full_name) ||
    (typeof identity.name === "string" && identity.name) ||
    user?.email ||
    "Você";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "??";
  return { avatar, initials };
}

function extractQuestion(fullPrompt: string) {
  const marker = "## PERGUNTA";
  const index = fullPrompt.indexOf(marker);
  return index === -1 ? fullPrompt : fullPrompt.slice(index + marker.length).trim();
}
