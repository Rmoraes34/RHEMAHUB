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
import { Plus, ExternalLink, Trash2, Pencil, AppWindow } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/aplicativos")({
  component: Aplicativos,
});

const EMPTY = { nome: "", descricao: "", url: "", categoria: "" };

function Aplicativos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [f, setF] = useState({ ...EMPTY });

  const { data: links = [] } = useQuery({
    queryKey: ["app_links"],
    queryFn: async () => {
      const { data } = await supabase.from("app_links").select("*").order("nome");
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
    setF({ nome: l.nome ?? "", descricao: l.descricao ?? "", url: l.url ?? "", categoria: l.categoria ?? "" });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.nome || !f.url) return toast.error("Informe nome e link");
    let url = f.url.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const payload = { nome: f.nome, descricao: f.descricao || null, url, categoria: f.categoria || null };
    const { error } = editing
      ? await supabase.from("app_links").update(payload).eq("id", editing.id)
      : await supabase.from("app_links").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Ferramenta atualizada" : "Ferramenta adicionada");
    qc.invalidateQueries({ queryKey: ["app_links"] });
    setF({ ...EMPTY });
    setEditing(null);
    setOpen(false);
  }

  async function del(id: string) {
    await supabase.from("app_links").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["app_links"] });
  }

  return (
    <div>
      <PageHeader
        title="Aplicativos & Ferramentas"
        description="Acesso rápido às plataformas externas que a Rhema usa no dia a dia"
        action={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo link</Button>}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar ferramenta" : "Nova ferramenta"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1"><Label>Nome*</Label><Input required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex: Gerador de Roteiro" /></div>
            <div className="space-y-1"><Label>Descrição</Label><Textarea rows={2} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
            <div className="space-y-1"><Label>Link de acesso*</Label><Input required value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://..." /></div>
            <div className="space-y-1"><Label>Categoria</Label><Input value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="Ex: IA, Design, Drive" /></div>
            <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l: any) => (
          <Card key={l.id} className="flex flex-col p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <AppWindow className="h-5 w-5" />
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
            <a href={l.url} target="_blank" rel="noreferrer" className="mt-auto">
              <Button variant="outline" size="sm" className="w-full">
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir
              </Button>
            </a>
          </Card>
        ))}
      </div>
      {links.length === 0 && (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhuma ferramenta cadastrada ainda. Clique em "Novo link" para adicionar.
        </Card>
      )}
    </div>
  );
}
