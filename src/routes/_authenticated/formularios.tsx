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
} from "@/components/ui/dialog";
import { Plus, ExternalLink, Trash2, Pencil, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/formularios")({
  component: Formularios,
});

const EMPTY = { nome: "", categoria: "", url: "", descricao: "" };

function Formularios() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [f, setF] = useState({ ...EMPTY });

  const { data: forms = [] } = useQuery({
    queryKey: ["form_templates"],
    queryFn: async () => {
      const { data } = await supabase.from("form_templates").select("*").order("nome");
      return data ?? [];
    },
  });

  function openNew() {
    setEditing(null);
    setF({ ...EMPTY });
    setOpen(true);
  }

  function openEdit(l: any) {
    setEditing(l);
    setF({ nome: l.nome ?? "", categoria: l.categoria ?? "", url: l.url ?? "", descricao: l.descricao ?? "" });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome) return toast.error("Informe o nome do formulário");
    let url = f.url.trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    const payload = { nome: f.nome, categoria: f.categoria || null, url: url || null, descricao: f.descricao || null };
    const { error } = editing
      ? await supabase.from("form_templates").update(payload).eq("id", editing.id)
      : await supabase.from("form_templates").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Formulário atualizado" : "Formulário adicionado");
    qc.invalidateQueries({ queryKey: ["form_templates"] });
    setF({ ...EMPTY });
    setEditing(null);
    setOpen(false);
  }

  async function del(id: string) {
    await supabase.from("form_templates").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["form_templates"] });
  }

  return (
    <div>
      <PageHeader
        title="Formulários & Modelos"
        description="Repositório geral de formulários reutilizáveis da agência (briefings, onboarding, pesquisas...)"
        action={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo formulário</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar formulário" : "Novo formulário"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1"><Label>Nome*</Label><Input required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex: Briefing de Cliente Novo" /></div>
            <div className="space-y-1"><Label>Categoria / tipo</Label><Input value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="Ex: Briefing, Onboarding, Pesquisa" /></div>
            <div className="space-y-1"><Label>Link do Google Forms</Label><Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://forms.gle/..." /></div>
            <div className="space-y-1"><Label>Quando usar</Label><Textarea rows={2} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Descrição de quando/como usar este formulário" /></div>
            <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {forms.map((l: any) => (
          <Card key={l.id} className="flex flex-col p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="font-semibold">{l.nome}</div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(l)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => del(l.id)} aria-label="Excluir">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {l.categoria && <Badge variant="secondary" className="mb-2 w-fit">{l.categoria}</Badge>}
            {l.descricao && <p className="mb-3 flex-1 text-sm text-muted-foreground">{l.descricao}</p>}
            {l.url && (
              <a href={l.url} target="_blank" rel="noreferrer" className="mt-auto">
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir formulário
                </Button>
              </a>
            )}
          </Card>
        ))}
      </div>
      {forms.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum formulário cadastrado ainda. Clique em "Novo formulário" para adicionar.
        </Card>
      )}
    </div>
  );
}
