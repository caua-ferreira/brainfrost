"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarClock, CreditCard, Download, Receipt, ShieldCheck } from "lucide-react";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { useBilling } from "@/components/saas/BillingProvider";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";

type Plan = "monthly" | "annual";

const money = (cents: number, currency = "brl") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

const date = (timestamp: number | string | null) => {
  if (!timestamp) return "—";
  const value = typeof timestamp === "number" ? new Date(timestamp * 1000) : new Date(timestamp);
  return value.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

function statusLabel(status: string) {
  return {
    active: "ativa",
    trialing: "período de teste",
    past_due: "pagamento pendente",
    unpaid: "não paga",
    canceled: "cancelada",
    incomplete: "incompleta",
  }[status] ?? status;
}

export default function AssinaturaPage() {
  const theme = useSaas((s) => s.theme);
  const c = palette(theme);
  const { data, loading, error, isPro, refresh } = useBilling();
  const [paidNotice, setPaidNotice] = useState(false);
  const [busy, setBusy] = useState<Plan | "portal" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPaidNotice(params.get("paid") === "1");
  }, []);

  async function checkout(plan: Plan) {
    setBusy(plan);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.url) {
        alert(json.error ?? "Não foi possível abrir o checkout.");
        return;
      }
      window.location.href = json.url;
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setBusy("portal");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.url) {
        alert(json.error ?? "Não foi possível abrir o portal de cobrança.");
        return;
      }
      window.location.href = json.url;
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) return <LoadingScreen message="consultando assinatura" />;

  const subscription = data?.subscription;
  const invoices = data?.invoices ?? [];
  const method = data?.paymentMethods?.[0];

  return (
    <div className="relative h-full overflow-y-auto overflow-x-hidden" style={{ background: c.bg }}>
      <div className="pointer-events-none absolute -right-32 top-0 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: c.accent, opacity: 0.1 }} />
      <div className="pointer-events-none absolute -left-32 top-72 h-[520px] w-[520px] rounded-full blur-3xl" style={{ background: c.aurora, opacity: 0.07 }} />

      <div className="relative mx-auto max-w-4xl px-6 py-16 md:py-20">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.accent }}>
          assinatura e pagamentos
        </p>
        <h1 className="mt-3 text-[42px] font-semibold leading-[1.02] tracking-tight md:text-[56px]" style={{ color: c.text }}>
          Seu plano,
          <br />
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${c.accent}, ${c.aurora})` }}>
            sob controle.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed" style={{ color: c.dim }}>
          Consulte o plano, os pagamentos e as faturas. Cartão, troca de forma de pagamento e cancelamento ficam seguros no portal do Stripe.
        </p>

        {paidNotice && (
          <div className="mt-8 rounded-2xl border p-4 text-[13px]" style={{ borderColor: c.aurora, background: `${c.aurora}12`, color: c.text }}>
            Pagamento enviado. O Stripe pode levar alguns segundos para confirmar sua assinatura; atualize esta tela em instantes.
            <button className="ml-2 underline underline-offset-4" onClick={() => { setPaidNotice(false); refresh(); }}>
              atualizar
            </button>
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-2xl border p-4 text-[13px]" style={{ borderColor: "#c2415a66", background: "#c2415a12", color: "#c2415a" }}>
            {error}
          </div>
        )}

        <section className="mt-12 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border p-5" style={{ background: c.card, borderColor: c.border }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${isPro ? c.aurora : c.accent}20`, color: isPro ? c.aurora : c.accent }}>
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: c.dim }}>plano atual</p>
                  <p className="mt-1 text-[20px] font-semibold" style={{ color: c.text }}>{isPro ? `Pro ${subscription?.plan === "annual" ? "anual" : "mensal"}` : "Free"}</p>
                </div>
              </div>
              <span className="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider" style={{ background: `${isPro ? c.aurora : c.dim}20`, color: isPro ? c.aurora : c.dim }}>
                {subscription ? statusLabel(subscription.status) : "sem cobrança"}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: c.borderSoft }}>
              <Metric label="importações este mês" value={`${data?.usage.importsThisMonth ?? 0}${isPro ? "" : " / 3"}`} c={c} />
              <Metric label="camadas no cofre" value={`${data?.usage.layers ?? 0}${isPro ? "" : " / 50"}`} c={c} />
              <Metric label={subscription?.cancelAtPeriodEnd ? "acesso até" : "próxima cobrança"} value={subscription ? date(subscription.currentPeriodEnd) : "—"} c={c} />
              <Metric label="total pago" value={money(data?.totals?.totalPaid ?? 0)} c={c} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {subscription && (
                <button onClick={openPortal} disabled={busy !== null} className="flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium disabled:opacity-50" style={{ background: c.accent, color: c.onAccent }}>
                  <CreditCard className="h-3.5 w-3.5" />
                  {busy === "portal" ? "abrindo…" : "gerenciar pagamento"}
                </button>
              )}
              <button onClick={() => refresh()} disabled={loading} className="rounded-full border px-4 py-2 text-[12px] font-medium disabled:opacity-50" style={{ borderColor: c.borderSoft, color: c.text }}>
                {loading ? "atualizando…" : "atualizar status"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border p-5" style={{ background: c.card, borderColor: c.border }}>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" style={{ color: c.accent }} />
              <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>forma de pagamento</p>
            </div>
            {method ? (
              <div className="mt-6">
                <p className="text-[17px] font-semibold" style={{ color: c.text }}>{method.brand.toUpperCase()} ···· {method.last4}</p>
                <p className="mt-1 font-mono text-[11px]" style={{ color: c.dim }}>vence em {String(method.expMonth).padStart(2, "0")}/{method.expYear}</p>
              </div>
            ) : (
              <p className="mt-6 text-[13px] leading-relaxed" style={{ color: c.dim }}>Nenhum cartão cadastrado. Ao assinar, o Stripe solicitará uma forma de pagamento.</p>
            )}
            {subscription && <p className="mt-5 text-[11px]" style={{ color: c.dim }}>Para trocar o cartão, use “gerenciar pagamento”.</p>}
          </div>
        </section>

        {!isPro && (
          <section className="mt-8 rounded-2xl border-2 p-6" style={{ background: c.card, borderColor: c.accent }}>
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.accent }}>desbloqueie o Pro</p>
                <h2 className="mt-2 text-[22px] font-semibold" style={{ color: c.text }}>Mais contexto, sem limite.</h2>
                <p className="mt-2 max-w-xl text-[13px] leading-relaxed" style={{ color: c.dim }}>Claude, Gemini, GitHub privado, importações ilimitadas e camadas ilimitadas.</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => checkout("monthly")} disabled={busy !== null} className="rounded-full px-4 py-2 text-[12px] font-medium disabled:opacity-50" style={{ background: c.accent, color: c.onAccent }}>{busy === "monthly" ? "abrindo…" : "Pro mensal"}</button>
                <button onClick={() => checkout("annual")} disabled={busy !== null} className="rounded-full border px-4 py-2 text-[12px] font-medium disabled:opacity-50" style={{ borderColor: c.borderSoft, color: c.text }}>{busy === "annual" ? "abrindo…" : "Pro anual"}</button>
              </div>
            </div>
          </section>
        )}

        {data?.totals?.overdue ? (
          <div className="mt-8 rounded-2xl border p-4" style={{ borderColor: "#c2415a66", background: "#c2415a12", color: "#c2415a" }}>
            Há {money(data.totals.overdue)} em faturas vencidas. Atualize a forma de pagamento no portal para evitar a suspensão do Pro.
          </div>
        ) : null}

        <section className="mt-12 border-t pt-8" style={{ borderColor: c.borderSoft }}>
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4" style={{ color: c.accent }} />
            <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: c.dim }}>faturas</p>
          </div>
          {invoices.length === 0 ? (
            <p className="mt-5 text-[13px]" style={{ color: c.dim }}>Suas faturas aparecerão aqui depois da primeira cobrança.</p>
          ) : (
            <div className="mt-4 divide-y rounded-2xl border" style={{ background: c.card, borderColor: c.border }}>
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 p-4" style={{ borderColor: c.borderSoft }}>
                  <div className="flex items-center gap-3">
                    <CalendarClock className="h-4 w-4" style={{ color: c.dim }} />
                    <div>
                      <p className="text-[13px] font-medium" style={{ color: c.text }}>{invoice.number ?? invoice.id}</p>
                      <p className="mt-0.5 font-mono text-[10px]" style={{ color: c.dim }}>{date(invoice.createdAt)} · {statusLabel(invoice.status)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[12px]" style={{ color: invoice.status === "paid" ? c.aurora : c.text }}>{money(invoice.status === "paid" ? invoice.amountPaid : invoice.amountDue, invoice.currency)}</span>
                    {invoice.pdfUrl && <a href={invoice.pdfUrl} target="_blank" rel="noreferrer" className="text-[11px]" style={{ color: c.accent }} title="Baixar fatura"><Download className="h-4 w-4" /></a>}
                    {invoice.hostedUrl && <a href={invoice.hostedUrl} target="_blank" rel="noreferrer" className="text-[11px]" style={{ color: c.accent }} title="Abrir fatura"><ArrowUpRight className="h-4 w-4" /></a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, c }: { label: string; value: string; c: ReturnType<typeof palette> }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: c.dim }}>{label}</p>
      <p className="mt-1 text-[14px] font-medium" style={{ color: c.text }}>{value}</p>
    </div>
  );
}
