"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { BadgeCheck, CalendarPlus, Gift, Search, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignInAt: string | null;
  access: "free" | "paid" | "grant" | "paid_and_grant";
  subscription: {
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  grant: {
    expires_at: string | null;
    reason: string;
    revoked_at: string | null;
    updated_at: string;
  } | null;
};

type AdminData = {
  users: ManagedUser[];
  totals: { users: number; paid: number; complimentary: number; free: number };
  recentEvents: Array<{
    id: string;
    email: string;
    action: string;
    new_expires_at: string | null;
    reason: string;
    created_at: string;
  }>;
};

const accessLabel: Record<ManagedUser["access"], string> = {
  free: "Free",
  paid: "Pro pago",
  grant: "Pro cortesia",
  paid_and_grant: "Pro pago + cortesia",
};

function formatDate(value: string | null) {
  if (!value) return "vitalício";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function GestaoAssinaturasPage() {
  const theme = useSaas((state) => state.theme);
  const c = palette(theme);
  const [data, setData] = useState<AdminData | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState("Acesso cortesia concedido pelo suporte");
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
    try {
      await load(query);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro desconhecido");
    }
  }

  async function mutate(action: "grant" | "extend" | "revoke", lifetime = false) {
    if (!selected) return;
    if (action === "revoke" && !window.confirm(`Revogar a cortesia Pro de ${selected.email}?`)) return;
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
      setNotice(action === "revoke" ? "Cortesia revogada." : lifetime ? "Pro vitalício concedido." : `Acesso Pro atualizado por ${days} dias.`);
      await load(query);
      setSelected(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro desconhecido");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) return <LoadingScreen message="carregando assinaturas" mascot="/mascot/yeti-laptop-ezgif.com-crop.gif" />;

  return (
    <div className="h-full overflow-y-auto p-5 md:p-8" style={{ background: c.bg, color: c.text }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: c.dim }}>admin · acesso restrito</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Gestão de assinaturas</h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: c.dim }}>Consulte planos pagos e conceda extensões Pro sem cobrança. O Stripe continua sendo a fonte das assinaturas e faturas pagas.</p>
        </div>

        {data && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="usuários" value={data.totals.users} icon={<UserRound />} c={c} />
            <Metric label="Pro pago" value={data.totals.paid} icon={<BadgeCheck />} c={c} />
            <Metric label="Pro cortesia" value={data.totals.complimentary} icon={<Gift />} c={c} />
            <Metric label="Free" value={data.totals.free} icon={<ShieldCheck />} c={c} />
          </div>
        )}

        <form onSubmit={search} className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: c.dim }} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome ou e-mail" className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm outline-none" style={{ borderColor: c.border, background: c.card }} />
          </div>
          <button className="rounded-xl px-5 text-sm font-medium" style={{ background: c.accent, color: c.onAccent }}>Buscar</button>
        </form>

        {(error || notice) && <div className="mt-4 rounded-xl border p-3 text-sm" style={{ borderColor: error ? "#c2415a66" : c.aurora, background: error ? "#c2415a12" : `${c.aurora}12`, color: error ? "#c2415a" : c.text }}>{error ?? notice}</div>}

        {data && (
          <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: c.border, background: c.card }}>
            {data.users.length === 0 ? <p className="p-6 text-sm" style={{ color: c.dim }}>Nenhum usuário encontrado.</p> : data.users.map((user) => (
              <button key={user.id} onClick={() => { setSelected(user); setNotice(null); }} className="grid w-full gap-3 border-b p-4 text-left transition-colors last:border-0 hover:bg-black/[0.03] md:grid-cols-[minmax(0,1.5fr)_160px_180px_auto] md:items-center" style={{ borderColor: c.borderSoft }}>
                <div className="min-w-0"><p className="truncate text-sm font-medium">{user.name || user.email}</p><p className="mt-1 truncate font-mono text-[10px]" style={{ color: c.dim }}>{user.email}</p></div>
                <span className="w-fit rounded-full px-2.5 py-1 font-mono text-[10px] uppercase" style={{ background: `${user.access === "free" ? c.dim : c.aurora}20`, color: user.access === "free" ? c.dim : c.aurora }}>{accessLabel[user.access]}</span>
                <div className="text-xs" style={{ color: c.dim }}>{user.grant && !user.grant.revoked_at ? `cortesia até ${formatDate(user.grant.expires_at)}` : user.subscription ? `Stripe: ${user.subscription.status}` : "sem assinatura"}</div>
                <CalendarPlus className="h-4 w-4 md:justify-self-end" style={{ color: c.accent }} />
              </button>
            ))}
          </div>
        )}

        {data && data.recentEvents.length > 0 && (
          <section className="mt-6 rounded-2xl border p-5" style={{ borderColor: c.border, background: c.card }}>
            <h2 className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: c.dim }}>alterações recentes</h2>
            <div className="mt-3 divide-y" style={{ borderColor: c.borderSoft }}>
              {data.recentEvents.slice(0, 12).map((event) => (
                <div key={event.id} className="grid gap-1 py-3 text-xs md:grid-cols-[minmax(0,1fr)_100px_160px] md:items-center">
                  <div className="min-w-0"><p className="truncate font-medium">{event.email}</p><p className="mt-1 truncate" style={{ color: c.dim }}>{event.reason}</p></div>
                  <span className="font-mono uppercase" style={{ color: c.accent }}>{event.action}</span>
                  <span className="font-mono text-[10px] md:text-right" style={{ color: c.dim }}>{new Date(event.created_at).toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 md:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setSelected(null); }}>
          <div className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl" style={{ borderColor: c.border, background: c.card }}>
            <div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{selected.name || selected.email}</p><p className="mt-1 font-mono text-[11px]" style={{ color: c.dim }}>{selected.email}</p></div><button onClick={() => setSelected(null)} disabled={busy}><XCircle className="h-5 w-5" style={{ color: c.dim }} /></button></div>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border p-4 text-xs" style={{ borderColor: c.borderSoft }}><div><p style={{ color: c.dim }}>acesso atual</p><p className="mt-1 font-medium">{accessLabel[selected.access]}</p></div><div><p style={{ color: c.dim }}>cortesia</p><p className="mt-1 font-medium">{selected.grant && !selected.grant.revoked_at ? formatDate(selected.grant.expires_at) : "não ativa"}</p></div></div>
            <label className="mt-5 block text-xs" style={{ color: c.dim }}>Motivo</label>
            <input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none" style={{ borderColor: c.borderSoft }} />
            <label className="mt-4 block text-xs" style={{ color: c.dim }}>Dias para conceder ou acrescentar</label>
            <input type="number" min={1} max={3650} value={days} onChange={(event) => setDays(Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none" style={{ borderColor: c.borderSoft }} />
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => mutate(selected.access === "free" ? "grant" : "extend")} disabled={busy} className="rounded-full px-4 py-2 text-xs font-medium disabled:opacity-50" style={{ background: c.accent, color: c.onAccent }}>{busy ? "salvando…" : selected.access === "free" ? "Conceder Pro" : "Estender Pro"}</button>
              <button onClick={() => mutate("grant", true)} disabled={busy} className="rounded-full border px-4 py-2 text-xs font-medium disabled:opacity-50" style={{ borderColor: c.borderSoft }}>Conceder vitalício</button>
              {selected.grant && !selected.grant.revoked_at && <button onClick={() => mutate("revoke")} disabled={busy} className="rounded-full border px-4 py-2 text-xs font-medium text-red-600 disabled:opacity-50" style={{ borderColor: "#c2415a55" }}>Revogar cortesia</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon, c }: { label: string; value: number; icon: React.ReactNode; c: ReturnType<typeof palette> }) {
  return <div className="rounded-2xl border p-4" style={{ borderColor: c.border, background: c.card }}><div className="flex items-center gap-2" style={{ color: c.accent }}>{icon}<span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: c.dim }}>{label}</span></div><p className="mt-3 text-2xl font-semibold">{value}</p></div>;
}
