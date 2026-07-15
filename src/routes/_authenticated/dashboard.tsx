import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { AlertsPanel } from "@/components/alerts-panel";
import { ContractsExpiringCard } from "@/components/dashboard/ContractsExpiringCard";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/lib/format";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Target,
  Package,
  Smile,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Period = "mes" | "trimestre" | "ano";

function startOf(period: Period): string {
  const d = new Date();
  if (period === "mes") d.setMonth(d.getMonth() - 1);
  else if (period === "trimestre") d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function Dashboard() {
  const { canFinance } = useAuth();
  const [period, setPeriod] = useState<Period>("ano");
  const since = startOf(period);

  const { data } = useQuery({
    queryKey: ["dashboard", period, canFinance],
    queryFn: async () => {
      const [clients, leads, stages, payments, deliverables, nps] = await Promise.all([
        supabase.from("clients").select("id,status").is("deleted_at", null),
        supabase.from("leads").select("id,valor,stage_id").is("deleted_at", null),
        supabase.from("funnel_stages").select("id,is_won,is_lost"),
        canFinance
          ? supabase.from("payments").select("valor,status,data_pagamento,data_vencimento")
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("content_posts").select("status,entregue,data_post,tipo,atividade,tema,clients(razao_social,cor)"),
        supabase.from("nps_records").select("nota,data_avaliacao"),
      ]);
      return {
        clients: clients.data ?? [],
        leads: leads.data ?? [],
        stages: stages.data ?? [],
        payments: (payments.data ?? []) as any[],
        deliverables: deliverables.data ?? [],
        nps: nps.data ?? [],
      };
    },
  });

  const stats = useMemo(() => {
    const d = data;
    if (!d) return null;
    const wonIds = new Set(d.stages.filter((s) => s.is_won).map((s) => s.id));
    const lostIds = new Set(d.stages.filter((s) => s.is_lost).map((s) => s.id));
    const activeClients = d.clients.filter((c) => c.status === "ativo").length;
    const negotiating = d.leads.filter((l) => !wonIds.has(l.stage_id ?? "") && !lostIds.has(l.stage_id ?? "")).length;

    const received = d.payments.filter((p) => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);
    const toReceive = d.payments.filter((p) => p.status === "pendente").reduce((s, p) => s + Number(p.valor), 0);
    const overdue = d.payments.filter((p) => p.status === "atrasado").reduce((s, p) => s + Number(p.valor), 0);
    const paidCount = d.payments.filter((p) => p.status === "pago").length;
    const ticket = paidCount ? received / paidCount : 0;

    const isDelivered = (x: any) => x.status === "publicado" || x.entregue === true;
    const isLate = (x: any) =>
      !isDelivered(x) &&
      (x.status ?? "agendado") === "agendado" &&
      x.data_post &&
      new Date(x.data_post + "T00:00:00") < new Date(new Date().toDateString());
    const onTime = d.deliverables.filter(isDelivered).length;
    const lateItems = d.deliverables.filter(isLate);
    const late = lateItems.length;

    // Detalhamento por cliente: entregues, atrasadas e pendentes.
    const byClientMap = new Map<
      string,
      { nome: string; cor: string; entregues: number; atrasadas: number; pendentes: number }
    >();
    d.deliverables.forEach((x: any) => {
      const nome = x.clients?.razao_social ?? "Sem cliente";
      const cor = x.clients?.cor ?? "#94a3b8";
      const cur = byClientMap.get(nome) ?? { nome, cor, entregues: 0, atrasadas: 0, pendentes: 0 };
      if (isDelivered(x)) cur.entregues += 1;
      else if (isLate(x)) cur.atrasadas += 1;
      else cur.pendentes += 1;
      byClientMap.set(nome, cur);
    });
    const byClient = Array.from(byClientMap.values()).sort(
      (a, b) => b.atrasadas - a.atrasadas || b.pendentes - a.pendentes || b.entregues - a.entregues,
    );

    const npsAvg = d.nps.length ? d.nps.reduce((s, n) => s + n.nota, 0) / d.nps.length : 0;

    return { activeClients, negotiating, received, toReceive, overdue, ticket, onTime, late, byClient, npsAvg };
  }, [data]);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    (data?.payments ?? []).filter((p) => p.status === "pago" && p.data_pagamento).forEach((p) => {
      const key = String(p.data_pagamento).slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + Number(p.valor));
    });
    return Array.from(map.entries())
      .sort()
      .map(([mes, valor]) => ({ mes, valor }));
  }, [data]);

  const npsSeries = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    (data?.nps ?? []).forEach((n) => {
      const key = String(n.data_avaliacao).slice(0, 7);
      const cur = map.get(key) ?? { total: 0, count: 0 };
      cur.total += n.nota;
      cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .sort()
      .map(([mes, v]) => ({ mes, nota: +(v.total / v.count).toFixed(1) }));
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão consolidada da agência"
        action={
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Último mês</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="ano">Ano</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Clientes ativos" value={String(stats?.activeClients ?? 0)} />
        <StatCard icon={Target} label="Leads em negociação" value={String(stats?.negotiating ?? 0)} />
        {canFinance && <StatCard icon={TrendingUp} label="Ticket médio" value={formatBRL(stats?.ticket)} />}
        {canFinance && (
          <StatCard icon={AlertTriangle} label="Inadimplência" value={formatBRL(stats?.overdue)} tone="warning" />
        )}
      </div>

      {canFinance && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatCard icon={TrendingUp} label="Total recebido" value={formatBRL(stats?.received)} tone="success" />
          <StatCard icon={Package} label="A receber" value={formatBRL(stats?.toReceive)} />
          <StatCard icon={Smile} label="NPS médio" value={(stats?.npsAvg ?? 0).toFixed(1)} />
        </div>
      )}

      <div className="mt-6 space-y-6">
        <ContractsExpiringCard />
        <AlertsPanel />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {canFinance && (
          <Card className="p-5">
            <h3 className="mb-4 font-semibold">Evolução de entradas</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Bar dataKey="valor" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Entregas</h3>
          <div className="flex items-center gap-6 py-6">
            <div className="flex-1 text-center">
              <div className="text-4xl font-extrabold text-success">{stats?.onTime ?? 0}</div>
              <div className="text-sm text-muted-foreground">No prazo / entregues</div>
            </div>
            <div className="h-16 w-px bg-border" />
            <div className="flex-1 text-center">
              <div className="text-4xl font-extrabold text-destructive">{stats?.late ?? 0}</div>
              <div className="text-sm text-muted-foreground">Atrasadas</div>
            </div>
          </div>
          {stats?.byClient && stats.byClient.length > 0 && (
            <div className="border-t pt-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <span className="flex-1">Por cliente</span>
                <span className="w-14 text-right text-success">Entreg.</span>
                <span className="w-14 text-right text-destructive">Atras.</span>
              </div>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {stats.byClient.map((c) => (
                  <div key={c.nome} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} />
                    <span className="flex-1 truncate font-medium" style={{ color: c.cor }}>{c.nome}</span>
                    <span className="w-14 text-right font-semibold text-success">{c.entregues}</span>
                    <span
                      className={"w-14 text-right font-semibold " + (c.atrasadas > 0 ? "text-destructive" : "text-muted-foreground")}
                    >
                      {c.atrasadas}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Evolução do NPS</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={npsSeries}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis domain={[0, 10]} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="nota" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <Card className="flex items-center gap-4 p-5 shadow-[var(--shadow-card)]">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Icon className="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div
          className={
            "text-2xl font-extrabold " +
            (tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground")
          }
        >
          {value}
        </div>
      </div>
    </Card>
  );
}
