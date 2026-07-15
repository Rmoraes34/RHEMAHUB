import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTeam } from "@/hooks/use-team";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import {
  STATUS_PRODUCAO,
  STATUS_EDICAO,
  STATUS_POSTAGEM,
  patchForStatusProducao,
  patchForStatusEdicao,
  patchForStatusPostagem,
  updateContentPost,
} from "@/lib/operacao";

type Stage = "producao" | "edicao" | "postagem";

export function StageTab({ clientId, stage, contractId }: { clientId: string; stage: Stage; contractId?: string }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["operacao", clientId, stage, contractId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("content_posts")
        .select("*, team_members!content_posts_assignee_id_fkey(nome), editor:team_members!content_posts_editor_id_fkey(nome), postador:team_members!content_posts_postador_id_fkey(nome)")
        .eq("client_id", clientId);
      if (contractId) q = q.eq("contract_id", contractId);
      if (stage === "postagem") {
        q = q.in("etapa_atual", ["postagem", "publicado"]);
      } else {
        q = q.eq("etapa_atual", stage);
      }
      const { data } = await q.order("data_publicacao", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });

  const [editing, setEditing] = useState<any>(null);

  async function del(id: string) {
    if (!confirm("Excluir este conteúdo?")) return;
    const { error } = await supabase.from("content_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    qc.invalidateQueries({ queryKey: ["operacao", clientId] });
    qc.invalidateQueries({ queryKey: ["editions"] });
    qc.invalidateQueries({ queryKey: ["posts", clientId] });
  }

  async function changeStatus(post: any, status: string) {
    const patch =
      stage === "producao" ? patchForStatusProducao(status)
      : stage === "edicao" ? patchForStatusEdicao(status)
      : patchForStatusPostagem(status);
    const { error } = await updateContentPost(post.id, patch);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["operacao", clientId] });
    qc.invalidateQueries({ queryKey: ["editions"] });
    qc.invalidateQueries({ queryKey: ["posts", clientId] });
  }

  const statusList = stage === "producao" ? STATUS_PRODUCAO : stage === "edicao" ? STATUS_EDICAO : STATUS_POSTAGEM;
  const statusField = stage === "producao" ? "status_producao" : stage === "edicao" ? "status_edicao" : "status_postagem";
  const dateField = stage === "producao" ? "data_gravacao" : stage === "edicao" ? "data_edicao" : "data_publicacao";
  const dateLabel = stage === "producao" ? "Gravação" : stage === "edicao" ? "Edição" : "Publicação";

  return (
    <Card className="mt-4 p-6">
      <p className="mb-3 text-xs text-muted-foreground">
        Conteúdos nesta etapa. Ao avançar o status para{" "}
        <strong>
          {stage === "producao" ? "Gravado" : stage === "edicao" ? "Aprovado" : "Publicado"}
        </strong>
        , o item {stage === "postagem" ? "é marcado como entregue" : "vai automaticamente para a próxima etapa"}.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3">Título</th>
              <th className="py-2 pr-3">Categoria</th>
              <th className="py-2 pr-3">{dateLabel}</th>
              <th className="py-2 pr-3">Responsável</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((p: any) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 pr-3 font-medium">{p.titulo || p.atividade || p.tema}</td>
                <td className="py-2 pr-3"><Badge variant="outline" className="text-[10px]">{p.categoria}</Badge></td>
                <td className="py-2 pr-3 text-muted-foreground">{formatDate(p[dateField] || p.data_post)}</td>
                <td className="py-2 pr-3 text-muted-foreground">{stage === "edicao" ? (p.editor?.nome || "—") : stage === "postagem" ? (p.postador?.nome || "—") : (p.team_members?.nome || "—")}</td>
                <td className="py-2 pr-3">
                  <Select value={p[statusField] || statusList[0].value} onValueChange={(v) => changeStatus(p, v)}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusList.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2 text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(p)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del(p.id)} title="Excluir">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum conteúdo nesta etapa.</p>
        )}
      </div>

      {editing && (
        <EditContentDialog
          post={editing}
          stage={stage}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["operacao", clientId] });
            qc.invalidateQueries({ queryKey: ["editions"] });
          }}
        />
      )}
    </Card>
  );
}

function EditContentDialog({ post, stage, onClose, onSaved }: { post: any; stage: Stage; onClose: () => void; onSaved: () => void }) {
  const { data: team = [] } = useTeam();
  const [f, setF] = useState({
    titulo: post.titulo ?? post.atividade ?? "",
    tema: post.tema ?? "",
    objetivo: post.objetivo ?? "",
    briefing: post.briefing ?? "",
    roteiro: post.roteiro ?? "",
    referencias: (post.referencias ?? []).join("\n") as string,
    assignee_id: post.assignee_id ?? "none",
    editor_id: post.editor_id ?? "none",
    postador_id: post.postador_id ?? "none",
    data_gravacao: post.data_gravacao ?? "",
    data_edicao: post.data_edicao ?? "",
    data_publicacao: post.data_publicacao ?? post.data_post ?? "",
    horario_publicacao: post.horario_publicacao ?? "",
    plataformas: (post.plataformas ?? []).join(", ") as string,
    legenda: post.legenda ?? "",
  });

  async function save() {
    const patch: any = {
      titulo: f.titulo.trim(),
      atividade: f.titulo.trim(),
      tema: f.tema.trim() || f.titulo.trim(),
      objetivo: f.objetivo || null,
      briefing: f.briefing || null,
      roteiro: f.roteiro || null,
      referencias: f.referencias.split("\n").map((s) => s.trim()).filter(Boolean),
      assignee_id: f.assignee_id === "none" ? null : f.assignee_id,
      editor_id: f.editor_id === "none" ? null : f.editor_id,
      postador_id: f.postador_id === "none" ? null : f.postador_id,
      data_gravacao: f.data_gravacao || null,
      data_edicao: f.data_edicao || null,
      data_publicacao: f.data_publicacao || null,
      data_post: f.data_publicacao || post.data_post,
      horario_publicacao: f.horario_publicacao || null,
      plataformas: f.plataformas.split(",").map((s) => s.trim()).filter(Boolean),
      legenda: f.legenda || null,
    };
    const { error } = await supabase.from("content_posts").update(patch).eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Editar conteúdo</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label>Título</Label><Input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></div>
            <div className="space-y-1"><Label>Tema</Label><Input value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} /></div>
          </div>

          {stage === "producao" && (
            <>
              <div className="space-y-1"><Label>Objetivo</Label><Textarea rows={2} value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} /></div>
              <div className="space-y-1"><Label>Briefing</Label><Textarea rows={3} value={f.briefing} onChange={(e) => setF({ ...f, briefing: e.target.value })} /></div>
              <div className="space-y-1"><Label>Roteiro</Label><Textarea rows={4} value={f.roteiro} onChange={(e) => setF({ ...f, roteiro: e.target.value })} /></div>
              <div className="space-y-1"><Label>Referências (uma por linha, links ou nomes de arquivos)</Label><Textarea rows={2} value={f.referencias} onChange={(e) => setF({ ...f, referencias: e.target.value })} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label>Responsável (produção)</Label>
                  <Select value={f.assignee_id} onValueChange={(v) => setF({ ...f, assignee_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">—</SelectItem>{team.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Data da gravação</Label><Input type="date" value={f.data_gravacao} onChange={(e) => setF({ ...f, data_gravacao: e.target.value })} /></div>
              </div>
            </>
          )}

          {stage === "edicao" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Editor responsável</Label>
                <Select value={f.editor_id} onValueChange={(v) => setF({ ...f, editor_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">—</SelectItem>{team.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Data da edição</Label><Input type="date" value={f.data_edicao} onChange={(e) => setF({ ...f, data_edicao: e.target.value })} /></div>
            </div>
          )}

          {stage === "postagem" && (
            <>
              <div className="space-y-1"><Label>Legenda</Label><Textarea rows={3} value={f.legenda} onChange={(e) => setF({ ...f, legenda: e.target.value })} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label>Plataformas (separadas por vírgula)</Label><Input value={f.plataformas} onChange={(e) => setF({ ...f, plataformas: e.target.value })} placeholder="Instagram, TikTok, YouTube" /></div>
                <div className="space-y-1"><Label>Responsável (postagem)</Label>
                  <Select value={f.postador_id} onValueChange={(v) => setF({ ...f, postador_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">—</SelectItem>{team.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Data de publicação</Label><Input type="date" value={f.data_publicacao} onChange={(e) => setF({ ...f, data_publicacao: e.target.value })} /></div>
                <div className="space-y-1"><Label>Horário</Label><Input type="time" value={f.horario_publicacao} onChange={(e) => setF({ ...f, horario_publicacao: e.target.value })} /></div>
              </div>
            </>
          )}
        </div>
        <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
