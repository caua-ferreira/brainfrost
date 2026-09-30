"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock3, Database, Eye, Users } from "lucide-react";
import { useSaas } from "@/lib/saas-mock";
import { palette } from "@/lib/saas-theme";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

type Summary = {
  generatedAt: string;
  users: {
    total: number;
    new7d: number;
    activeNow: number;
    dau: number;
    wau: number;
    mau: number;
    averageActiveMinutes30d: number;
  };
  usage: {
    pageViews14d: number;
    topRoutes: Array<{ path: string; views: number }>;
    daily: Array<{ date: string; activeUsers: number; pageViews: number }>;
  };
  imports: {
    total30d: number;
    successful30d: number;
    failed30d: number;
    successRate30d: number;
  };
  errors: {
    total7d: number;
    byStage: Array<{ stage: string; count: number }>;
    recent: Array<{ error_id: string; stage: string; provider: string | null; message: string; occurred_at: string }>;
  };
  syntheticChecks: Array<{
    check_name: string;
    status: string;
    duration_ms: number;
    provider: string | null;
    suggestions_count: number | null;
    error_id: string | null;
    occurred_at: string;
  }>;
};

export default function ObservabilidadePage() {
  const theme = useSaas((state) => state.theme);
  const c = palette(theme);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/observability/summary")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar as métricas.");
        setSummary(data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Erro desconhecido"));
  }, []);

  if (!summary && !error) {
    return <LoadingScreen message="carregando observabilidade" mascot="/mascot/yeti-laptop-ezgif.com-crop.gif" />;
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8" style={{ background: c.bg, color: c.text }}>
        <div className="max-w-md rounded-2xl border p-6 text-center" style={{ borderColor: c.border, background: c.card }}>
          <AlertTriangle className="mx-auto mb-3 h-7 w-7" style={{ color: c.accent }} />
          <p className="font-medium">{error}</p>
          <p className="mt-2 text-sm" style={{ color: c.dim }}>O painel é restrito aos administradores configurados.</p>
        </div>
      </div>
    );
  }

  const data = summary!;
  const latestCheck = data.syntheticChecks[0];
  return (
    <div className="h-full overflow-y-auto p-5 md:p-8" style={{ background: c.bg, color: c.text }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em]" style={{ color: c.dim }}>admin · dados próprios</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Observabilidade</h1>
            <p className="mt-2 text-sm" style={{ color: c.dim }}>Uso real, confiabilidade das importações e saúde da IA.</p>
          </div>
          <p className="font-mono text-[10px]" style={{ color: c.dim }}>
            atualizado {new Date(data.generatedAt).toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={<Users />} label="usuários" value={data.users.total} detail={`+${data.users.new7d} em 7 dias`} c={c} />
          <MetricCard icon={<Activity />} label="ativos agora" value={data.users.activeNow} detail={`DAU ${data.users.dau} · WAU ${data.users.wau} · MAU ${data.users.mau}`} c={c} />
          <MetricCard icon={<Clock3 />} label="tempo ativo médio" value={`${data.users.averageActiveMinutes30d} min`} detail="por usuário nos últimos 30 dias" c={c} />
          <MetricCard icon={<Database />} label="sucesso das importações" value={`${data.imports.successRate30d}%`} detail={`${data.imports.successful30d} ok · ${data.imports.failed30d} erros`} c={c} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Panel title="Rotas mais usadas" icon={<Eye />} c={c}>
            {data.usage.topRoutes.length === 0 ? <Empty c={c} /> : data.usage.topRoutes.map((route) => (
              <Row key={route.path} left={route.path} right={`${route.views} views`} c={c} />
            ))}
          </Panel>
          <Panel title="Erros por etapa · 7 dias" icon={<AlertTriangle />} c={c}>
            {data.errors.byStage.length === 0 ? <Empty c={c} /> : data.errors.byStage.map((item) => (
              <Row key={item.stage} left={item.stage} right={String(item.count)} c={c} />
            ))}
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel title="Teste sintético real" icon={<Activity />} c={c}>
            {!latestCheck ? <Empty c={c} /> : (
              <>
                <Row left="status" right={latestCheck.status === "ok" ? "saudável" : "falhou"} c={c} />
                <Row left="duração" right={`${latestCheck.duration_ms} ms`} c={c} />
                <Row left="sugestões" right={String(latestCheck.suggestions_count ?? 0)} c={c} />
                <Row left="última execução" right={new Date(latestCheck.occurred_at).toLocaleString("pt-BR")} c={c} />
              </>
            )}
          </Panel>
          <Panel title="Erros recentes" icon={<AlertTriangle />} c={c}>
            {data.errors.recent.length === 0 ? <Empty c={c} /> : data.errors.recent.slice(0, 8).map((item) => (
              <div key={item.error_id} className="border-b py-3 last:border-0" style={{ borderColor: c.borderSoft }}>
                <div className="flex justify-between gap-3 text-xs"><span>{item.stage}</span><span style={{ color: c.dim }}>{new Date(item.occurred_at).toLocaleString("pt-BR")}</span></div>
                <p className="mt-1 truncate font-mono text-[10px]" style={{ color: c.dim }}>{item.error_id}</p>
                <p className="mt-1 line-clamp-2 text-xs" style={{ color: c.dim }}>{item.message}</p>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

type Colors = ReturnType<typeof palette>;

function MetricCard({ icon, label, value, detail, c }: { icon: React.ReactNode; label: string; value: string | number; detail: string; c: Colors }) {
  return <div className="rounded-2xl border p-5" style={{ borderColor: c.border, background: c.card }}><div className="h-5 w-5" style={{ color: c.accent }}>{icon}</div><p className="mt-5 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs font-medium uppercase tracking-wide" style={{ color: c.dim }}>{label}</p><p className="mt-3 text-xs" style={{ color: c.dim }}>{detail}</p></div>;
}

function Panel({ title, icon, children, c }: { title: string; icon: React.ReactNode; children: React.ReactNode; c: Colors }) {
  return <section className="rounded-2xl border p-5" style={{ borderColor: c.border, background: c.card }}><div className="mb-3 flex items-center gap-2 text-sm font-medium"><span className="h-4 w-4" style={{ color: c.accent }}>{icon}</span>{title}</div>{children}</section>;
}

function Row({ left, right, c }: { left: string; right: string; c: Colors }) {
  return <div className="flex items-center justify-between gap-4 border-b py-3 text-sm last:border-0" style={{ borderColor: c.borderSoft }}><span className="truncate">{left}</span><span className="shrink-0 font-mono text-xs" style={{ color: c.dim }}>{right}</span></div>;
}

function Empty({ c }: { c: Colors }) {
  return <p className="py-6 text-center text-sm" style={{ color: c.dim }}>Ainda não há dados suficientes.</p>;
}
