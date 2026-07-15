import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SERVICE_CATEGORIES } from "@/lib/categories";
import { formatBRL } from "@/lib/format";
import { Plus, Pencil, Trash2, Package, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/servicos")({
  component: ServicosPage,
});

const EMPTY = { nome: "", categoria: "Social Media", tipo: "recorrente", descricao: "", contrato_minimo: "", valor: "0" };

function usePackages() {
  return useQuery({
    queryKey: ["service_packages"],
    queryFn: async () => {
      const { data } = await supabase.from("service_packages").select("*").order("nome");
      return data ?? [];
    },
  });
}

function ServicosPage() {
  const { data = [] } = usePackages();
  const recorrentes = data.filter((p) => p.tipo === "recorrente");
  const avulsos = data.filter((p) => p.tipo === "avulso");

  return (
    <div>
      <PageHeader
        title="Serviços & Pacotes"
        description="Catálogo interno de serviços vendidos pela Rhema. Base para propostas do CRM e contratos."
        action={<PackageDialog />}
      />
      <Section title="Pacotes Recorrentes" icon={Package} items={recorrentes} />
      <div className="h-8" />
      <Section title="Serviços Avulsos" icon={Zap} items={avulsos} />
    </div>
  );
}

function Section({ title, icon: Icon, items }: { title: string; icon: typeof Package; items: any[] }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PackageCard({ pkg }: { pkg: any }) {
  const qc = useQueryClient();
  async function del() {
    if (!confirm("Excluir este item do catálogo?")) return;
    await supabase.from("service_packages").delete().eq("id", pkg.id);
    qc.invalidateQueries({ queryKey: ["service_packages"] });
  }
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold">{pkg.nome}</h3>
          <Badge variant="secondary" className="mt-1">{pkg.categoria}</Badge>
        </div>
        <div className="flex gap-1">
          <PackageDialog pkg={pkg} />
          <Button variant="ghost" size="icon" onClick={del}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      {pkg.descricao && <p className="mb-3 text-sm text-muted-foreground">{pkg.descricao}</p>}
      <div className="mt-auto flex items-end justify-between">
        <div className="text-xl font-extrabold text-primary">{formatBRL(pkg.valor)}</div>
        {pkg.contrato_minimo && (
          <div className="text-xs text-muted-foreground">Mín.: {pkg.contrato_minimo}</div>
        )}
      </div>
    </Card>
  );
}

function PackageDialog({ pkg }: { pkg?: any }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>(
    pkg
      ? {
          nome: pkg.nome,
          categoria: pkg.categoria,
          tipo: pkg.tipo,
          descricao: pkg.descricao ?? "",
          contrato_minimo: pkg.contrato_minimo ?? "",
          valor: String(pkg.valor ?? 0),
        }
      : EMPTY,
  );

  async function save() {
    if (!f.nome) return toast.error("Informe o nome");
    const payload = { ...f, valor: Number(f.valor) || 0, contrato_minimo: f.contrato_minimo || null, descricao: f.descricao || null };
    const { error } = pkg
      ? await supabase.from("service_packages").update(payload).eq("id", pkg.id)
      : await supabase.from("service_packages").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    if (!pkg) setF(EMPTY);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["service_packages"] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {pkg ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button><Plus className="mr-2 h-4 w-4" /> Novo pacote/serviço</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{pkg ? "Editar" : "Novo"} pacote/serviço</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recorrente">Recorrente</SelectItem>
                  <SelectItem value="avulso">Avulso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição (o que está incluso)</Label>
            <Textarea rows={3} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Valor (R$)</Label>
              <Input type="number" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Contrato mínimo</Label>
              <Input placeholder="ex: 6 meses" value={f.contrato_minimo} onChange={(e) => setF({ ...f, contrato_minimo: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
