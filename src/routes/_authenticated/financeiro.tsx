import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatDate } from "@/lib/format";
import { Plus, Settings2, TrendingUp, TrendingDown, AlertTriangle, Pencil, Trash2, X } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financeiro")({
  component: Financeiro,
});

const CATS = [
  { key: "pct_imposto", label: "Imposto", color: "var(--chart-5)" },
  { key: "pct_caixa", label: "Caixa da empresa", color: "var(--chart-1)" },
  { key: "pct_comissao", label: "Comissão", color: "var(--chart-3)" },
  { key: "pct_ferramentas", label: "Ferramentas/Apps", color: "var(--chart-4)" },
] as const;

const EXTRA_COLORS = ["var(--chart-2)", "var(--primary)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

interface Extra {
  nome: string;
  pct: number;
}

function parseExtra(v: unknown): Extra[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({ nome: String((x as any).nome ?? ""), pct: Number((x as any).pct) || 0 }))
    .filter((x) => x.nome.trim());
}

function Financeiro() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["finance_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("finance_settings").select("*").eq("id", 1).single();
      return data;
    },
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*, clients(razao_social)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id,razao_social").is("deleted_at", null).order("razao_social");
      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    const paid = payments.filter((p: any) => p.status === "pago");
    const received = paid.reduce((s: number, p: any) => s + Number(p.valor), 0);
    const toReceive = payments.filter((p: any) => p.status === "pendente").reduce((s: number, p: any) => s + Number(p.valor), 0);
    const overdue = payments.filter((p: any) => p.status === "atrasado").reduce((s: number, p: any) => s + Number(p.valor), 0);

    const agg = new Map<string, number>();
    CATS.forEach((c) => agg.set(c.label, 0));
    paid.forEach((p: any) => {
      CATS.forEach((c) => agg.set(c.label, (agg.get(c.label) ?? 0) + (Number(p.valor) * Number(p[c.key])) / 100));
      parseExtra(p.split_extra).forEach((e) => agg.set(e.nome, (agg.get(e.nome) ?? 0) + (Number(p.valor) * e.pct) / 100));
    });
    let ei = 0;
    const split = Array.from(agg.entries()).map(([name, value]) => {
      const fixed = CATS.find((c) => c.label === name);
      return { name, value, color: fixed ? fixed.color : EXTRA_COLORS[ei++ % EXTRA_COLORS.length] };
    });
    return { received, toReceive, overdue, split };
  }, [payments]);

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Pagamentos, divisão automática e inadimplência"
        action={
          <div className="flex gap-2">
            <GlobalSettings settings={settings} onSaved={() => qc.invalidateQueries({ queryKey: ["finance_settings"] })} />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Lançar pagamento</Button>
              </DialogTrigger>
              <PaymentForm settings={settings} clients={clients} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["payments"] }); }} />
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={TrendingUp} label="Total recebido" value={formatBRL(totals.received)} tone="success" />
        <StatCard icon={TrendingDown} label="A receber" value={formatBRL(totals.toReceive)} />
        <StatCard icon={AlertTriangle} label="Inadimplência" value={formatBRL(totals.overdue)} tone="warning" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 font-semibold">Divisão do recebido</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={totals.split} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {totals.split.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => formatBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1">
            {totals.split.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ background: s.color }} /> {s.name}
                </span>
                <span className="font-medium">{formatBRL(s.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-2 lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Venc.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.descricao ?? "—"}</TableCell>
                  <TableCell>{p.clients?.razao_social ?? "—"}</TableCell>
                  <TableCell>{formatBRL(p.valor)}</TableCell>
                  <TableCell className="text-sm">{formatDate(p.data_vencimento)}</TableCell>
                  <TableCell>
                    <PaymentStatus id={p.id} status={p.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(p)} aria-label="Editar lançamento">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setToDelete(p)} aria-label="Excluir lançamento">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum lançamento.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <PaymentForm
            settings={settings}
            clients={clients}
            payment={editing}
            onDone={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["payments"] }); }}
          />
        </Dialog>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento{toDelete?.descricao ? ` "${toDelete.descricao}"` : ""}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const { error } = await supabase.from("payments").delete().eq("id", toDelete.id);
                if (error) return toast.error(error.message);
                toast.success("Lançamento excluído");
                qc.invalidateQueries({ queryKey: ["payments"] });
                setToDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PaymentStatus({ id, status }: { id: string; status: string }) {
  const qc = useQueryClient();
  async function change(v: string) {
    const patch: any = { status: v };
    if (v === "pago") patch.data_pagamento = new Date().toISOString().slice(0, 10);
    await supabase.from("payments").update(patch).eq("id", id);
    qc.invalidateQueries({ queryKey: ["payments"] });
  }
  return (
    <Select value={status} onValueChange={change}>
      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="pendente">Pendente</SelectItem>
        <SelectItem value="pago">Pago</SelectItem>
        <SelectItem value="atrasado">Atrasado</SelectItem>
      </SelectContent>
    </Select>
  );
}

function GlobalSettings({ settings, onSaved }: { settings: any; onSaved: () => void }) {
  const [pct, setPct] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<Extra[] | null>(null);
  const cur = (k: string) => pct[k] ?? String(settings?.[k] ?? 0);
  const extraList = extras ?? parseExtra(settings?.categorias_extra);
  const total = CATS.reduce((s, c) => s + Number(cur(c.key)), 0) + extraList.reduce((s, e) => s + Number(e.pct), 0);

  function updateExtra(i: number, patch: Partial<Extra>) {
    setExtras(extraList.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  async function save() {
    const patch: any = { categorias_extra: extraList.filter((e) => e.nome.trim()) };
    CATS.forEach((c) => (patch[c.key] = Number(cur(c.key))));
    const { error } = await supabase.from("finance_settings").update(patch).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Divisão padrão salva");
    onSaved();
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline"><Settings2 className="mr-2 h-4 w-4" /> % padrão</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <h4 className="mb-2 font-semibold">Divisão padrão global</h4>
        {CATS.map((c) => (
          <div key={c.key} className="mb-2 flex items-center justify-between gap-2">
            <Label className="text-sm">{c.label}</Label>
            <div className="flex items-center gap-1">
              <Input className="h-8 w-20" type="number" value={cur(c.key)} onChange={(e) => setPct({ ...pct, [c.key]: e.target.value })} />
              <span className="text-sm">%</span>
            </div>
          </div>
        ))}
        {extraList.map((e, i) => (
          <div key={i} className="mb-2 flex items-center gap-1">
            <Input className="h-8 flex-1" placeholder="Nome da categoria" value={e.nome} onChange={(ev) => updateExtra(i, { nome: ev.target.value })} />
            <Input className="h-8 w-16" type="number" value={e.pct} onChange={(ev) => updateExtra(i, { pct: Number(ev.target.value) })} />
            <span className="text-sm">%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setExtras(extraList.filter((_, idx) => idx !== i))} aria-label="Remover categoria">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="mb-2 w-full" onClick={() => setExtras([...extraList, { nome: "", pct: 0 }])}>
          <Plus className="mr-1 h-4 w-4" /> Categoria personalizada
        </Button>
        <div className={"mb-2 text-sm " + (total === 100 ? "text-success" : "text-destructive")}>Total: {total}%</div>
        <Button className="w-full" size="sm" onClick={save}>Salvar</Button>
      </PopoverContent>
    </Popover>
  );
}

function PaymentForm({ settings, clients, payment, onDone }: { settings: any; clients: any[]; payment?: any; onDone: () => void }) {
  const isEdit = !!payment;
  const [f, setF] = useState({
    descricao: payment?.descricao ?? "",
    client_id: payment?.client_id ?? "",
    valor: payment ? String(payment.valor) : "",
    data_vencimento: payment?.data_vencimento ?? "",
    status: payment?.status ?? "pendente",
    responsavel_comissao: payment?.responsavel_comissao ?? "",
  });
  const [pct, setPct] = useState({
    pct_imposto: payment?.pct_imposto ?? settings?.pct_imposto ?? 15,
    pct_caixa: payment?.pct_caixa ?? settings?.pct_caixa ?? 60,
    pct_comissao: payment?.pct_comissao ?? settings?.pct_comissao ?? 10,
    pct_ferramentas: payment?.pct_ferramentas ?? settings?.pct_ferramentas ?? 15,
  });
  const [extras, setExtras] = useState<Extra[]>(
    payment ? parseExtra(payment.split_extra) : parseExtra(settings?.categorias_extra),
  );
  const [showSplit, setShowSplit] = useState(false);
  const valor = Number(f.valor) || 0;
  const total = CATS.reduce((s, c) => s + Number((pct as any)[c.key]), 0) + extras.reduce((s, e) => s + Number(e.pct), 0);

  function updateExtra(i: number, patch: Partial<Extra>) {
    setExtras(extras.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const record = {
      descricao: f.descricao || null, client_id: f.client_id || null, valor,
      data_vencimento: f.data_vencimento || null, status: f.status,
      data_pagamento: f.status === "pago" ? (payment?.data_pagamento ?? new Date().toISOString().slice(0, 10)) : null,
      responsavel_comissao: f.responsavel_comissao || null, ...pct,
      split_extra: extras.filter((x) => x.nome.trim()) as any,
    };
    const { error } = isEdit
      ? await supabase.from("payments").update(record).eq("id", payment.id)
      : await supabase.from("payments").insert(record);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Lançamento atualizado" : "Pagamento lançado");
    onDone();
  }

  const allCats = [...CATS.map((c) => ({ label: c.label, value: (valor * Number((pct as any)[c.key])) / 100 })), ...extras.filter((e) => e.nome.trim()).map((e) => ({ label: e.nome, value: (valor * Number(e.pct)) / 100 }))];

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{isEdit ? "Editar lançamento" : "Lançar pagamento"}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1"><Label>Descrição</Label><Input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Cliente</Label>
            <Select value={f.client_id} onValueChange={(v) => setF({ ...f, client_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Valor (R$)*</Label><Input required type="number" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Vencimento</Label><Input type="date" value={f.data_vencimento} onChange={(e) => setF({ ...f, data_vencimento: e.target.value })} /></div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1"><Label>Responsável comissão</Label><Input value={f.responsavel_comissao} onChange={(e) => setF({ ...f, responsavel_comissao: e.target.value })} /></div>

        <div className="rounded-lg border p-3">
          <button type="button" onClick={() => setShowSplit(!showSplit)} className="flex w-full items-center gap-2 text-sm font-medium">
            <Settings2 className="h-4 w-4" /> Ajustar divisão deste lançamento
          </button>
          {showSplit && (
            <div className="mt-3 space-y-2">
              {CATS.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-2">
                  <Label className="text-sm">{c.label}</Label>
                  <div className="flex items-center gap-1">
                    <Input className="h-8 w-20" type="number" value={(pct as any)[c.key]}
                      onChange={(e) => setPct({ ...pct, [c.key]: Number(e.target.value) })} />
                    <span className="text-sm">%</span>
                  </div>
                </div>
              ))}
              {extras.map((ex, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Input className="h-8 flex-1" placeholder="Nome da categoria" value={ex.nome} onChange={(e) => updateExtra(i, { nome: e.target.value })} />
                  <Input className="h-8 w-16" type="number" value={ex.pct} onChange={(e) => updateExtra(i, { pct: Number(e.target.value) })} />
                  <span className="text-sm">%</span>
                  <Button variant="ghost" size="icon" type="button" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setExtras(extras.filter((_, idx) => idx !== i))} aria-label="Remover categoria">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" type="button" className="w-full" onClick={() => setExtras([...extras, { nome: "", pct: 0 }])}>
                <Plus className="mr-1 h-4 w-4" /> Categoria personalizada
              </Button>
              <div className={"text-xs " + (total === 100 ? "text-success" : "text-destructive")}>Total: {total}%</div>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {allCats.map((c) => (
              <div key={c.label} className="flex justify-between rounded bg-muted/50 px-2 py-1">
                <span>{c.label}</span>
                <span className="font-semibold">{formatBRL(c.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter><Button type="submit">{isEdit ? "Salvar alterações" : "Salvar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "success" | "warning" }) {
  return (
    <Card className="flex items-center gap-4 p-5 shadow-[var(--shadow-card)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--gradient-primary)" }}>
        <Icon className="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={"text-2xl font-extrabold " + (tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground")}>{value}</div>
      </div>
    </Card>
  );
}
