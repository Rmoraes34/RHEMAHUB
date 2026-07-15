import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { ClientSelect } from "@/components/client-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeam } from "@/hooks/use-team";
import { formatDate } from "@/lib/format";
import { columnOfOp, isOverdueOp, KANBAN_COLUMNS, etapaLabel } from "@/lib/operacao";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/cronograma")({
  component: CronogramaPage,
});

const DEFAULT_CLIENT_COLOR = "#94a3b8";

function usePosts() {
  return useQuery({
    queryKey: ["editions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("content_posts")
        .select("*, clients(razao_social, cor), team_members!content_posts_assignee_id_fkey(nome), editor:team_members!content_posts_editor_id_fkey(nome), postador:team_members!content_posts_postador_id_fkey(nome)")
        .order("data_publicacao", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });
}

type PeriodMode = "semanal" | "mensal";

function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - day);
  return r;
}

function periodRange(anchor: Date, period: PeriodMode) {
  if (period === "semanal") {
    const start = startOfWeek(anchor);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function shiftAnchor(anchor: Date, period: PeriodMode, dir: number): Date {
  const r = new Date(anchor);
  if (period === "semanal") r.setDate(r.getDate() + dir * 7);
  else r.setMonth(r.getMonth() + dir);
  return r;
}

function periodLabel(anchor: Date, period: PeriodMode): string {
  const { start, end } = periodRange(anchor, period);
  if (period === "mensal") {
    const l = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return l.charAt(0).toUpperCase() + l.slice(1);
  }
  const s = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const e = end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  return `${s} – ${e}`;
}

function CronogramaPage() {
  const { data: posts = [] } = usePosts();
  const { data: team = [] } = useTeam();
  

  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [onlyLate, setOnlyLate] = useState(false);
  const [period, setPeriod] = useState<PeriodMode>("semanal");
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const { start, end } = periodRange(anchor, period);

  const filtered = useMemo(() => {
    return posts.filter((p: any) => {
      if (filterClient && p.client_id !== filterClient) return false;
      if (filterAssignee !== "all" && p.assignee_id !== filterAssignee && p.editor_id !== filterAssignee && p.postador_id !== filterAssignee) return false;
      if (onlyLate && !isOverdueOp(p)) return false;
      if (filterStatus !== "all" && columnOfOp(p) !== filterStatus) return false;
      const ref = p.data_publicacao || p.data_post;
      if (!ref) return false;
      const d = new Date(ref + "T00:00:00");
      return d >= start && d <= end;
    });
  }, [posts, filterClient, filterAssignee, filterStatus, onlyLate, start, end]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { producao: 0, edicao: 0, validacao: 0, agendado: 0, publicado: 0, atrasado: 0 };
    filtered.forEach((p: any) => { c[columnOfOp(p)]++; });
    return c;
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Cronograma Geral"
        description="Painel operacional consolidado de todos os clientes. Os conteúdos são criados dentro de cada cliente, na aba Operação."
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <IndicatorCard label="Em Produção" value={counts.producao} />
        <IndicatorCard label="Em Edição" value={counts.edicao} />
        <IndicatorCard label="Em Validação" value={counts.validacao} />
        <IndicatorCard label="Agendados" value={counts.agendado} />
        <IndicatorCard label="Publicados" value={counts.publicado} />
        <IndicatorCard label="Atrasados" value={counts.atrasado} highlight={counts.atrasado > 0} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodMode)}>
          <TabsList>
            <TabsTrigger value="semanal">Semanal</TabsTrigger>
            <TabsTrigger value="mensal">Mensal</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setAnchor((a) => shiftAnchor(a, period, -1))} aria-label="Período anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[180px] text-center">
            <div className="text-sm font-semibold capitalize">{periodLabel(anchor, period)}</div>
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setAnchor(new Date())}>Hoje</button>
          </div>
          <Button variant="outline" size="icon" onClick={() => setAnchor((a) => shiftAnchor(a, period, 1))} aria-label="Próximo período">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Label className="mb-1 block text-xs">Cliente</Label>
          <ClientSelect value={filterClient} onChange={setFilterClient} placeholder="Todos" />
        </div>
        <div>
          <Label className="mb-1 block text-xs">Responsável</Label>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {team.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {KANBAN_COLUMNS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={onlyLate} onCheckedChange={(v) => setOnlyLate(!!v)} /> Somente atrasados
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {KANBAN_COLUMNS.map((col) => {
          const cards = filtered.filter((p: any) => columnOfOp(p) === col.value);
          return (
            <div key={col.value} className="rounded-lg border bg-muted/30 p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-bold">{col.label}</span>
                <Badge variant="secondary">{cards.length}</Badge>
              </div>
              <div className="space-y-2">
                {cards.map((p: any) => <KanbanCard key={p.id} post={p} />)}
                {cards.length === 0 && (
                  <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">Vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IndicatorCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={`p-3 ${highlight ? "border-destructive/50 bg-destructive/5" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${highlight ? "text-destructive" : ""}`}>{value}</div>
    </Card>
  );
}

function KanbanCard({ post }: { post: any }) {
  const cor = post.clients?.cor || DEFAULT_CLIENT_COLOR;
  const overdue = isOverdueOp(post);
  const ref = post.data_publicacao || post.data_post;
  const etapa = post.etapa_atual || "producao";
  const resp = etapa === "edicao" ? post.editor?.nome : (etapa === "postagem" || etapa === "publicado") ? post.postador?.nome : post.team_members?.nome;
  return (
    <Card className="overflow-hidden p-3 pl-4" style={{ borderLeft: `4px solid ${cor}` }}>
      <div className="text-sm font-medium leading-tight">{post.titulo || post.atividade || post.tema}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-[10px] capitalize">{etapaLabel(etapa)}</Badge>
        {overdue && (
          <Badge variant="destructive" className="text-[10px]">
            <AlertTriangle className="mr-0.5 h-3 w-3" /> Atrasado
          </Badge>
        )}
      </div>
      {post.clients?.razao_social && (
        <div className="mt-1 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
          <span className="truncate text-xs font-semibold" style={{ color: cor }}>{post.clients.razao_social}</span>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatDate(ref)}</span>
        {resp && <span>Resp.: {resp}</span>}
      </div>
    </Card>
  );
}
