"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import {
  BadgeCheck,
  Ban,
  CalendarPlus,
  Gift,
  Search,
  ShieldCheck,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  XCircle,
} from "lucide-react";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  providers: string[];
  isAnonymous: boolean;
  blocked: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  lastAccessAt: string | null;
  activeMinutes: number;
  lastPath: string | null;
  recentPages: Array<{ path: string; occurredAt: string }>;
  acquisition: {
    source: string;
    medium: string | null;
    campaign: string | null;
    landingPath: string | null;
    capturedAt: string | null;
  } | null;
  access: "free" | "paid" | "grant" | "paid_and_grant";
  subscription: { status: string; current_period_end: string | null; cancel_at_period_end: boolean } | null;
  grant: { expires_at: string | null; reason: string; revoked_at: string | null; updated_at: string } | null;
};

type AdminData = {
  users: ManagedUser[];
  totals: { users: number; paid: number; complimentary: number; free: number; anonymous: number; blocked: number };
  recentEvents: Array<{ id: string; email: string; action: string; new_expires_at: string | null; reason: string; created_at: string }>;
};

const accessLabel: Record<ManagedUser["access"], string> = {
  free: "Free",
  paid: "Pro pago",
  grant: "Pro cortesia",
  paid_and_grant: "Pro pago + cortesia",
};

function formatDate(value: string | null, withTime = false) {
  if (!value) return "nunca";
  return new Date(value).toLocaleString("pt-BR", withTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" });
}

function providerLabel(provider: string) {
  return ({ google: "Google", github: "GitHub", azure: "Microsoft", email: "E-mail" } as Record<string, string>)[provider] ?? provider;
}

export default function GestaoPage() {
  const theme = useSaas((state) => state.theme);
  const c = palette(theme);
  const [data, setData] = useState<AdminData | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState("Ajuste administrativo de acesso");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (search = "") => {
    setError(null);
    const response = await fetch(`/api/admin/subscriptions?query=${encodeURIComponent(search)}`, { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error ?? "Não foi possível carregar os usuários.");
    setData(json as AdminData);
  }, []);

  useEffect(() => {
    load().catch((cause) => setError(cause instanceof Error ? cause.message : "Erro desconhecido"));
  }, [load]);

  async function search(event: FormEvent) {
    event.preventDefault();
    setData(null);
    try { await load(query); } catch (cause) { setError(cause instanceof Error ? cause.message : "Erro desconhecido"); }
  }

  async function mutate(action: "grant" | "extend" | "revoke" | "block" | "unblock", lifetime = false) {
    if (!selected) return;
    if (action === "revoke" && !window.confirm(`Revogar a cortesia Pro de ${selected.email}?`)) return;
    if (action === "block" && !window.confirm(`Bloquear o acesso de ${selected.email}? A assinatura no Stripe não será cancelada.`)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, action, days, lifetime, reason }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Não foi possível alterar o acesso.");
      const messages = { revoke: "Cortesia revogada.", block: "Acesso bloqueado.", unblock: "Acesso liberado." };
      setNotice(action in messages ? messages[action as keyof typeof messages] : lifetime ? "Pro vitalício concedido." : `Acesso Pro atualizado por ${days} dias.`);
      await load(query);
      setSelected(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro desconhecido");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) return <LoadingScreen message="carregando gestão" mascot="/mascot/yeti-laptop-ezgif.com-crop.gif" />;

  return (
    <div className="h-full overflow-y-auto p-5 md:p-8" style={{ background: c.bg, color: c.text }}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: c.dim }}>admin · acesso restrito</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Gestão</h1>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: c.dim }}>Gerencie usuários, acessos e cortesias. O bloqueio na plataforma não cancela cobranças ou assinaturas no Stripe.</p>
        </div>

        {data && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Metric label="usuários reais" value={data.totals.users} icon={<UserRound />} c={c} />
          <Metric label="Pro pago" value={data.totals.paid} icon={<BadgeCheck />} c={c} />
          <Metric label="cortesia" value={data.totals.complimentary} icon={<Gift />} c={c} />
          <Metric label="Free" value={data.totals.free} icon={<ShieldCheck />} c={c} />
          <Metric label="anônimos" value={data.totals.anonymous} icon={<UserRoundX />} c={c} />
          <Metric label="bloqueados" value={data.totals.blocked} icon={<Ban />} c={c} />
        </div>}

        <form onSubmit={search} className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: c.dim }} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou e-mail" className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm outline-none" style={{ borderColor: c.border, background: c.card }} />
          </div>
          <button className="rounded-xl px-5 text-sm font-medium" style={{ background: c.accent, color: c.onAccent }}>Buscar</button>
        </form>

        {(error || notice) && <div className="mt-4 rounded-xl border p-3 text-sm" style={{ borderColor: error ? "#c2415a66" : c.aurora, background: error ? "#c2415a12" : `${c.aurora}12`, color: error ? "#c2415a" : c.text }}>{error ?? notice}</div>}

        {data && <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: c.border, background: c.card }}>
          {data.users.length === 0 ? <p className="p-6 text-sm" style={{ color: c.dim }}>Nenhum usuário encontrado.</p> : data.users.map((user) => (
            <button key={user.id} onClick={() => { setSelected(user); setNotice(null); }} className="grid w-full gap-3 border-b p-4 text-left transition-colors last:border-0 hover:bg-black/[0.03] md:grid-cols-[minmax(0,1.5fr)_130px_150px_190px_auto] md:items-center" style={{ borderColor: c.borderSoft }}>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar user={user} c={c} />
                <div className="min-w-0"><p className="truncate text-sm font-medium">{user.name || user.email}</p><p className="mt-1 truncate font-mono text-[10px]" style={{ color: c.dim }}>{user.email}</p></div>
              </div>
              <span className="w-fit rounded-full px-2.5 py-1 font-mono text-[10px] uppercase" style={{ background: `${user.access === "free" ? c.dim : c.aurora}20`, color: user.access === "free" ? c.dim : c.aurora }}>{accessLabel[user.access]}</span>
              <p className="truncate text-xs" style={{ color: c.dim }}>{user.providers.length ? user.providers.map(providerLabel).join(", ") : "sem provedor"}</p>
              <div className="text-xs" style={{ color: c.dim }}><p>Último acesso</p><p className="mt-1 text-[11px]">{formatDate(user.lastAccessAt, true)}</p></div>
              {user.blocked ? <Ban className="h-4 w-4 text-red-600 md:justify-self-end" /> : <CalendarPlus className="h-4 w-4 md:justify-self-end" style={{ color: c.accent }} />}
            </button>
          ))}
        </div>}

        {data && data.recentEvents.length > 0 && <section className="mt-6 rounded-2xl border p-5" style={{ borderColor: c.border, background: c.card }}>
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: c.dim }}>alterações recentes</h2>
          <div className="mt-3 divide-y" style={{ borderColor: c.borderSoft }}>{data.recentEvents.slice(0, 12).map((event) => (
            <div key={event.id} className="grid gap-1 py-3 text-xs md:grid-cols-[minmax(0,1fr)_100px_160px] md:items-center">
              <div className="min-w-0"><p className="truncate font-medium">{event.email}</p><p className="mt-1 truncate" style={{ color: c.dim }}>{event.reason}</p></div>
              <span className="font-mono uppercase" style={{ color: c.accent }}>{event.action}</span>
              <span className="font-mono text-[10px] md:text-right" style={{ color: c.dim }}>{formatDate(event.created_at, true)}</span>
            </div>
          ))}</div>
        </section>}
      </div>

      {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 md:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setSelected(null); }}>
        <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-6 shadow-2xl" style={{ borderColor: c.border, background: c.card }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3"><Avatar user={selected} c={c} large /><div className="min-w-0"><p className="truncate font-semibold">{selected.name || "Nome não informado"}</p><p className="mt-1 truncate font-mono text-[11px]" style={{ color: c.dim }}>{selected.email}</p></div></div>
            <button onClick={() => setSelected(null)} disabled={busy}><XCircle className="h-5 w-5" style={{ color: c.dim }} /></button>
          </div>

          <div className="mt-5 grid gap-3 rounded-xl border p-4 text-xs sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: c.borderSoft }}>
            <Detail label="Plano" value={accessLabel[selected.access]} />
            <Detail label="Login" value={selected.providers.length ? selected.providers.map(providerLabel).join(", ") : "Anônimo"} />
            <Detail label="Criado em" value={formatDate(selected.createdAt, true)} />
            <Detail label="Último acesso" value={formatDate(selected.lastAccessAt, true)} />
            <Detail label="Tempo ativo" value={`${selected.activeMinutes} min`} />
            <Detail label="Última página" value={selected.lastPath ?? "sem registro"} />
          </div>

          <section className="mt-5 rounded-xl border p-4" style={{ borderColor: c.borderSoft }}>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: c.dim }}>origem do cadastro</h2>
            <p className="mt-2 text-sm font-medium">{selected.acquisition?.source ?? "Não registrada"}</p>
            {selected.acquisition && <p className="mt-1 text-xs" style={{ color: c.dim }}>{[selected.acquisition.medium, selected.acquisition.campaign, selected.acquisition.landingPath].filter(Boolean).join(" · ") || "acesso direto"}</p>}
          </section>

          <section className="mt-5 rounded-xl border p-4" style={{ borderColor: c.borderSoft }}>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: c.dim }}>páginas recentes</h2>
            {selected.recentPages.length === 0 ? <p className="mt-2 text-xs" style={{ color: c.dim }}>Nenhuma página registrada.</p> : <div className="mt-2 divide-y" style={{ borderColor: c.borderSoft }}>{selected.recentPages.map((page, index) => <div key={`${page.path}-${page.occurredAt}-${index}`} className="flex items-center justify-between gap-3 py-2 text-xs"><span className="truncate">{page.path}</span><span className="shrink-0 font-mono text-[10px]" style={{ color: c.dim }}>{formatDate(page.occurredAt, true)}</span></div>)}</div>}
          </section>

          <label className="mt-5 block text-xs" style={{ color: c.dim }}>Motivo da alteração</label>
          <input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none" style={{ borderColor: c.borderSoft }} />
          <label className="mt-4 block text-xs" style={{ color: c.dim }}>Dias para conceder ou acrescentar</label>
          <input type="number" min={1} max={3650} value={days} onChange={(event) => setDays(Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none" style={{ borderColor: c.borderSoft }} />
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => mutate(selected.access === "free" ? "grant" : "extend")} disabled={busy || selected.isAnonymous} className="rounded-full px-4 py-2 text-xs font-medium disabled:opacity-50" style={{ background: c.accent, color: c.onAccent }}>{busy ? "salvando…" : selected.access === "free" ? "Conceder Pro" : "Estender Pro"}</button>
            <button onClick={() => mutate("grant", true)} disabled={busy || selected.isAnonymous} className="rounded-full border px-4 py-2 text-xs font-medium disabled:opacity-50" style={{ borderColor: c.borderSoft }}>Conceder vitalício</button>
            {selected.grant && !selected.grant.revoked_at && <button onClick={() => mutate("revoke")} disabled={busy} className="rounded-full border px-4 py-2 text-xs font-medium text-red-600 disabled:opacity-50" style={{ borderColor: "#c2415a55" }}>Revogar cortesia</button>}
            <button onClick={() => mutate(selected.blocked ? "unblock" : "block")} disabled={busy || selected.isAnonymous} className="rounded-full border px-4 py-2 text-xs font-medium disabled:opacity-50" style={{ borderColor: selected.blocked ? c.aurora : "#c2415a55", color: selected.blocked ? c.aurora : "#c2415a" }}>{selected.blocked ? "Liberar acesso" : "Bloquear acesso"}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

function Avatar({ user, c, large = false }: { user: ManagedUser; c: ReturnType<typeof palette>; large?: boolean }) {
  const size = large ? "h-12 w-12" : "h-9 w-9";
  if (user.avatarUrl) return <img src={user.avatarUrl} alt="" className={`${size} shrink-0 rounded-full object-cover`} />;
  return <div className={`${size} flex shrink-0 items-center justify-center rounded-full`} style={{ background: `${c.accent}15`, color: c.accent }}>{user.blocked ? <UserRoundX className="h-5 w-5" /> : <UserRoundCheck className="h-5 w-5" />}</div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="opacity-60">{label}</p><p className="mt-1 break-words font-medium">{value}</p></div>;
}

function Metric({ label, value, icon, c }: { label: string; value: number; icon: ReactNode; c: ReturnType<typeof palette> }) {
  return <div className="rounded-2xl border p-4" style={{ borderColor: c.border, background: c.card }}><div className="flex items-center gap-2" style={{ color: c.accent }}>{icon}<span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: c.dim }}>{label}</span></div><p className="mt-3 text-2xl font-semibold">{value}</p></div>;
}
