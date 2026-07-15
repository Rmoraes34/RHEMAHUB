import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Building2, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clientes/")({
  component: ClientsList,
});

function ClientsList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ razao_social: "", documento: "", email: "", telefone: "", tipo: "recorrente" });
  const [editing, setEditing] = useState<any | null>(null);

  const [toDelete, setToDelete] = useState<any | null>(null);

  function openNew() {
    setEditing(null);
    setForm({ razao_social: "", documento: "", email: "", telefone: "", tipo: "recorrente" });
    setOpen(true);
  }

  function openEdit(c: any) {
    setEditing(c);
    setForm({
      razao_social: c.razao_social ?? "",
      documento: c.documento ?? "",
      email: c.email ?? "",
      telefone: c.telefone ?? "",
      tipo: c.tipo ?? "recorrente",
    });
    setOpen(true);
  }

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .is("deleted_at", null)
        .order("razao_social");
      return data ?? [];
    },
  });

  async function handleDelete() {
    if (!toDelete) return;
    const { error } = await supabase
      .from("clients")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", toDelete.id);
    if (error) return toast.error(error.message);
    toast.success("Cliente movido para a lixeira");
    qc.invalidateQueries({ queryKey: ["clients"] });
    setToDelete(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      razao_social: form.razao_social,
      documento: form.documento || null,
      email: form.email || null,
      telefone: form.telefone || null,
      tipo: form.tipo,
    };
    const { error } = editing
      ? await supabase.from("clients").update(payload).eq("id", editing.id)
      : await supabase.from("clients").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Cliente atualizado" : "Cliente criado");
    qc.invalidateQueries({ queryKey: ["clients"] });
    setOpen(false);
    setEditing(null);
    setForm({ razao_social: "", documento: "", email: "", telefone: "", tipo: "recorrente" });
  }

  const filtered = clients.filter((c: any) =>
    c.razao_social.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Todos os clientes da agência"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <Button onClick={openNew}>
              <Plus className="mr-2 h-4 w-4" /> Novo cliente
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div className="space-y-1">
                  <Label>Nome / Razão social*</Label>
                  <Input required value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>CNPJ / CPF</Label>
                    <Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recorrente">Recorrente</SelectItem>
                        <SelectItem value="avulso">Avulso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>E-mail</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Input
        placeholder="Buscar cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c: any) => (
          <Card
            key={c.id}
            className="flex items-center gap-3 p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-soft)]"
          >
            <Link to="/clientes/$id" params={{ id: c.id }} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{c.razao_social}</div>
                <div className="truncate text-xs text-muted-foreground">{c.email ?? c.documento ?? "—"}</div>
              </div>
              <Badge variant={c.tipo === "recorrente" ? "default" : "outline"}>{c.tipo}</Badge>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Editar cliente"
              onClick={() => openEdit(c)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              aria-label="Excluir cliente"
              onClick={() => setToDelete(c)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{toDelete?.razao_social}</strong>? O item ficará na lixeira por 30 dias antes de ser removido definitivamente.
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
    </div>
  );
}
