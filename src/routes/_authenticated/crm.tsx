import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRL } from "@/lib/format";
import { Plus, UserPlus, MessageSquare, Trash2, CalendarClock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { QuoteBuilder } from "@/components/quote-builder";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/crm")({
  component: CRM,
});

interface Stage {
  id: string;
  nome: string;
  ordem: number;
  is_won: boolean;
  is_lost: boolean;
}
interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  contato: string | null;
  origem: string | null;
  responsavel: string | null;
  vendedor_id: string | null;
  stage_id: string | null;
  tipo: string;
  valor: number;
  proposta_url: string | null;
  converted_client_id: string | null;
  updated_at?: string;
}
interface Seller {
  id: string;
  nome: string;
  perfil: string;
}

function CRM() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [vendedorFilter, setVendedorFilter] = useState<string>("todos");
  const [toDelete, setToDelete] = useState<Lead | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);

  async function handleDelete() {
    if (!toDelete) return;
    const { error } = await supabase
      .from("leads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    toast.success("Lead movido para a lixeira");
    qc.invalidateQueries({ queryKey: ["leads"] });
    setToDelete(null);
  }

  const { data: stages = [] } = useQuery({
    queryKey: ["stages"],
    queryFn: async () => {
      const { data } = await supabase.from("funnel_stages").select("*").order("ordem");
      return (data ?? []) as Stage[];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*").is("deleted_at", null).order("created_at", { ascending: false });
      return (data ?? []) as Lead[];
    },
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ["crm_sellers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, nome, perfil")
        .in("perfil", ["comercial", "admin"])
        .order("nome");
      return (data ?? []) as Seller[];
    },
  });

  const sellerName = (id: string | null) => sellers.find((s) => s.id === id)?.nome ?? null;
  const visibleLeads = vendedorFilter === "todos" ? leads : leads.filter((l) => l.vendedor_id === vendedorFilter);

  const move = useMutation({
    mutationFn: async ({ id, stage_id }: { id: string; stage_id: string }) => {
      const { error } = await supabase.from("leads").update({ stage_id, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  async function onDrop(stageId: string) {
    if (dragId) {
      await move.mutateAsync({ id: dragId, stage_id: stageId });
      setDragId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="CRM — Funil de Vendas"
        description="Arraste os leads entre as etapas"
        action={
          <div className="flex items-center gap-2">
            <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Ver por vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os vendedores</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Novo lead
                </Button>
              </DialogTrigger>
              <LeadForm stages={stages} sellers={sellers} onDone={() => setAddOpen(false)} />
            </Dialog>
          </div>
        }
      />

      <SellerPerformance leads={leads} stages={stages} sellers={sellers} />

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const items = visibleLeads.filter((l) => l.stage_id === stage.id);
          return (
            <div
              key={stage.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(stage.id)}
              className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/50 p-3"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-semibold">{stage.nome}</span>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {items.map((lead) => (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragId(lead.id)}
                    onClick={() => setSelected(lead)}
                    className="cursor-pointer p-3 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        {/reuni/i.test(stage.nome) && (
                          <CalendarClock className="h-4 w-4 shrink-0 text-primary" aria-label="Reunião marcada" />
                        )}
                        {lead.nome}
                      </span>
                      <div className="flex items-center gap-1">
                        <Badge variant={lead.tipo === "recorrente" ? "default" : "outline"} className="text-[10px]">
                          {lead.tipo === "recorrente" ? "Recorrente" : "Avulso"}
                        </Badge>
                        <button
                          type="button"
                          aria-label="Editar lead"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditLead(lead);
                          }}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="Excluir lead"
                          onClick={(e) => {
                            e.stopPropagation();
                            setToDelete(lead);
                          }}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {lead.empresa && <div className="text-xs text-muted-foreground">{lead.empresa}</div>}
                    {sellerName(lead.vendedor_id) && (
                      <div className="mt-1 text-[11px] text-muted-foreground">👤 {sellerName(lead.vendedor_id)}</div>
                    )}
                    <div className="mt-2 text-sm font-semibold text-primary">{formatBRL(lead.valor)}</div>
                    {stage.is_won && !lead.converted_client_id && (
                      <div className="mt-1 text-[11px] font-medium text-success">Pronto para converter →</div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <LeadDetail
          lead={selected}
          stages={stages}
          onClose={() => setSelected(null)}
          onConverted={(clientId) => {
            setSelected(null);
            navigate({ to: "/clientes/$id", params: { id: clientId } });
          }}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{toDelete?.nome}</strong>? O item ficará na lixeira por 30 dias antes de ser removido definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editLead && (
        <Dialog open onOpenChange={(o) => !o && setEditLead(null)}>
          <LeadForm stages={stages} sellers={sellers} lead={editLead} onDone={() => setEditLead(null)} />
        </Dialog>
      )}
    </div>
  );
}

function LeadForm({ stages, sellers, lead, onDone }: { stages: Stage[]; sellers: Seller[]; lead?: Lead; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: lead?.nome ?? "",
    empresa: lead?.empresa ?? "",
    contato: lead?.contato ?? "",
    origem: lead?.origem ?? "",
    responsavel: lead?.responsavel ?? "",
    vendedor_id: lead?.vendedor_id ?? "",
    tipo: lead?.tipo ?? "recorrente",
    valor: lead ? String(lead.valor ?? "") : "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const first = stages[0]?.id ?? null;
    const payload = {
      nome: form.nome,
      empresa: form.empresa || null,
      contato: form.contato || null,
      origem: form.origem || null,
      responsavel: form.responsavel || null,
      vendedor_id: form.vendedor_id || null,
      tipo: form.tipo,
      valor: Number(form.valor) || 0,
    };
    const { error } = lead
      ? await supabase.from("leads").update(payload).eq("id", lead.id)
      : await supabase.from("leads").insert({ ...payload, stage_id: first });
    if (error) return toast.error(error.message);
    toast.success(lead ? "Lead atualizado" : "Lead criado");
    qc.invalidateQueries({ queryKey: ["leads"] });
    onDone();
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle>
        <DialogDescription>{lead ? "Atualize os dados do lead." : "Cadastre um novo lead no funil."}</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1">
          <Label>Nome*</Label>
          <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Empresa</Label>
            <Input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Contato</Label>
            <Input value={form.contato} onChange={(e) => setForm({ ...form, contato: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Origem</Label>
            <Input value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Responsável</Label>
            <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Vendedor responsável</Label>
            <Select value={form.vendedor_id || "none"} onValueChange={(v) => setForm({ ...form, vendedor_id: v === "none" ? "" : v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem vendedor</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recorrente">Recorrente</SelectItem>
                <SelectItem value="avulso">Avulso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Valor (R$)</Label>
            <Input type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Salvar</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function LeadDetail({
  lead,
  stages,
  onClose,
  onConverted,
}: {
  lead: Lead;
  stages: Stage[];
  onClose: () => void;
  onConverted: (clientId: string) => void;
}) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const stage = stages.find((s) => s.id === lead.stage_id);
  const canQuote = !!stage && !stage.is_lost && !stage.is_won && stage.ordem >= 3;

  const { data: quotes = [] } = useQuery({
    queryKey: ["lead_quotes", lead.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("*")
        .eq("lead_id", lead.id)
        .order("versao", { ascending: false });
      return data ?? [];
    },
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["lead_interactions", lead.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_interactions")
        .select("*")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function addNote() {
    if (!note.trim()) return;
    const { error } = await supabase.from("lead_interactions").insert({ lead_id: lead.id, conteudo: note });
    if (error) return toast.error(error.message);
    setNote("");
    qc.invalidateQueries({ queryKey: ["lead_interactions", lead.id] });
  }

  async function convert() {
    const { data, error } = await supabase
      .from("clients")
      .insert({
        razao_social: lead.empresa || lead.nome,
        contato_responsavel: lead.nome,
        tipo: lead.tipo,
      })
      .select("id")
      .single();
    if (error || !data) return toast.error(error?.message ?? "Erro");
    await supabase.from("leads").update({ converted_client_id: data.id }).eq("id", lead.id);
    await supabase.from("quotes").update({ client_id: data.id }).eq("lead_id", lead.id);
    toast.success("Lead convertido em cliente!");
    qc.invalidateQueries({ queryKey: ["leads"] });
    onConverted(data.id);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead.nome}</DialogTitle>
          <DialogDescription>
            {lead.empresa} • {stage?.nome} • {formatBRL(lead.valor)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <div>Contato: <span className="text-foreground">{lead.contato ?? "—"}</span></div>
            <div>Origem: <span className="text-foreground">{lead.origem ?? "—"}</span></div>
            <div>Responsável: <span className="text-foreground">{lead.responsavel ?? "—"}</span></div>
            <div>Tipo: <span className="text-foreground capitalize">{lead.tipo}</span></div>
          </div>

          {stage?.is_won && !lead.converted_client_id && (
            <Button className="w-full" onClick={convert}>
              <UserPlus className="mr-2 h-4 w-4" /> Converter em cliente
            </Button>
          )}
          {lead.converted_client_id && (
            <Button variant="outline" className="w-full" onClick={() => onConverted(lead.converted_client_id!)}>
              Ver cliente
            </Button>
          )}

          {canQuote && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4 text-primary" /> Orçamentos
              </div>
              <Button className="w-full" onClick={() => setQuoteOpen(true)}>
                <FileText className="mr-2 h-4 w-4" /> Gerar orçamento
              </Button>
              {quotes.length > 0 && (
                <div className="mt-3 space-y-2">
                  {quotes.map((q: any) => (
                    <div key={q.id} className="flex items-center justify-between rounded-md border bg-card p-2 text-xs">
                      <div>
                        <div className="font-medium">Versão {q.versao} • {formatBRL(q.total)}</div>
                        <div className="text-muted-foreground">{new Date(q.created_at).toLocaleDateString("pt-BR")}</div>
                      </div>
                      <Badge variant="secondary" className="capitalize">{q.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <QuoteBuilder
            open={quoteOpen}
            onOpenChange={setQuoteOpen}
            leadId={lead.id}
            clientId={lead.converted_client_id}
            clienteNome={lead.nome}
            clienteEmpresa={lead.empresa}
            clienteContato={lead.contato}
          />


          <div>
            <div className="mb-2 flex items-center gap-2 font-medium">
              <MessageSquare className="h-4 w-4" /> Histórico de interações
            </div>
            <div className="flex gap-2">
              <Input placeholder="Adicionar anotação..." value={note} onChange={(e) => setNote(e.target.value)} />
              <Button onClick={addNote}>Add</Button>
            </div>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {interactions.map((i: any) => (
                <div key={i.id} className="rounded-lg border bg-muted/30 p-2 text-xs">
                  <div>{i.conteudo}</div>
                  <div className="mt-1 text-muted-foreground">{new Date(i.created_at).toLocaleString("pt-BR")}</div>
                </div>
              ))}
              {interactions.length === 0 && <p className="text-xs text-muted-foreground">Sem interações.</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SellerPerformance({ leads, stages, sellers }: { leads: Lead[]; stages: Stage[]; sellers: Seller[] }) {
  if (sellers.length === 0) return null;
  const wonIds = new Set(stages.filter((s) => s.is_won).map((s) => s.id));
  const lostIds = new Set(stages.filter((s) => s.is_lost).map((s) => s.id));
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const rows = sellers.map((s) => {
    const own = leads.filter((l) => l.vendedor_id === s.id);
    const ganhos = own.filter((l) => wonIds.has(l.stage_id ?? ""));
    const perdidos = own.filter((l) => lostIds.has(l.stage_id ?? ""));
    const emAndamento = own.filter((l) => !wonIds.has(l.stage_id ?? "") && !lostIds.has(l.stage_id ?? ""));
    const fechados = ganhos.filter((l) => (l.updated_at ?? "").slice(0, 7) === monthKey).length;
    const closable = ganhos.length + perdidos.length;
    const conv = closable ? Math.round((ganhos.length / closable) * 100) : 0;
    return { s, total: own.length, emAndamento: emAndamento.length, ganhos: ganhos.length, fechados, conv };
  });

  return (
    <Card className="mb-6 p-5">
      <h3 className="mb-3 text-sm font-semibold">Desempenho por vendedor</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ s, total, emAndamento, ganhos, fechados, conv }) => (
          <div key={s.id} className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{s.nome}</span>
              <Badge variant="outline" className="text-[10px] capitalize">{s.perfil}</Badge>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-xs">
              <div><div className="text-base font-extrabold">{total}</div><div className="text-muted-foreground">Leads</div></div>
              <div><div className="text-base font-extrabold">{emAndamento}</div><div className="text-muted-foreground">Ativos</div></div>
              <div><div className="text-base font-extrabold text-success">{fechados}</div><div className="text-muted-foreground">Mês</div></div>
              <div><div className="text-base font-extrabold text-primary">{conv}%</div><div className="text-muted-foreground">Conv.</div></div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
