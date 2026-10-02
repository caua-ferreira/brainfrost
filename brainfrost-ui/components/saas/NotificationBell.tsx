"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { useSession } from "@/components/saas/SessionProvider";
import { getSupabase } from "@/lib/supabase/client";

type Notification = {
  id: string;
  kind: string;
  title: string;
  message: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationBell() {
  const { session } = useSession();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ notifications: Notification[] }> : { notifications: [] })
      .then(({ notifications }) => setItems(notifications))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;

    load();
    const supabase = getSupabase();
    const channel = supabase
      .channel(`app-notifications:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        load
      )
      .subscribe();

    const onFocus = () => load();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Fallback para ambientes que bloqueiam WebSocket ou ainda não aplicaram
    // a publicação Realtime da tabela.
    const timer = window.setInterval(load, 15_000);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [load, session?.user.id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const unread = items.filter((item) => !item.read_at).length;

  async function markRead(id?: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    }).catch(() => undefined);
    setItems((current) => current.map((item) => !id || item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item));
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8 md:rounded-md" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}>
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-600 px-1 text-[9px] font-bold text-white">{Math.min(unread, 9)}{unread > 9 ? "+" : ""}</span>}
      </button>

      {open && createPortal(
        <>
          <button
            type="button"
            aria-label="Fechar notificações"
            className="fixed inset-0 z-[100] cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-label="Notificações"
            className="fixed right-3 top-[68px] z-[110] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-border bg-card font-sans text-foreground shadow-2xl md:right-6"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="text-sm font-semibold">Notificações</p>{unread > 0 && <button onClick={() => markRead()} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"><CheckCheck className="h-3.5 w-3.5" />marcar todas</button>}</div>
            <div className="max-h-[min(420px,calc(100dvh-96px))] overflow-y-auto">
              {items.length === 0 ? <p className="px-4 py-8 text-center text-xs text-muted-foreground">Nenhuma notificação.</p> : items.map((item) => {
                const content = <><div className="flex items-start justify-between gap-3"><p className="text-[13px] font-semibold">{item.title}</p>{!item.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-600" />}</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.message}</p><p className="mt-2 font-mono text-[9px] text-muted-foreground">{formatDate(item.created_at)}</p></>;
                const className = `block border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50 ${item.read_at ? "" : "bg-cyan-500/[0.05]"}`;
                return item.href ? <Link key={item.id} href={item.href} onClick={() => { void markRead(item.id); setOpen(false); }} className={className}>{content}</Link> : <button key={item.id} onClick={() => markRead(item.id)} className={`w-full ${className}`}>{content}</button>;
              })}
            </div>
          </section>
        </>,
        document.body
      )}
    </div>
  );
}
