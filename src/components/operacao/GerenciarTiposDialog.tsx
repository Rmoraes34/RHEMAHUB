import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Settings2, Trash2, Check, X, Pencil } from "lucide-react";
import { toast } from "sonner";

const LIST_KEY = "tipo_conteudo";

export function useTiposConteudo() {
  return useQuery({
    queryKey: ["list_options", LIST_KEY],
    queryFn: async () => {
      const { data } = await supabase
        .from("list_options")
        .select("*")
        .eq("list_key", LIST_KEY)
        .order("ordem");
      return data ?? [];
    },
  });
}

export function GerenciarTiposDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState("");
  const [editing, setEditing] = useState<{ id: string; label: string } | null>(null);
  function setEditingLabel(label: string) {
    setEditing((prev) => (prev ? { ...prev, label } : prev));
  }
  const { data: tipos = [] } = useTiposConteudo();

  async function add() {
    const label = novo.trim();
    if (!label) return;
    const ordem = (tipos.at(-1)?.ordem ?? 0) + 1;
    const { error } = await supabase.from("list_options").insert({ list_key: LIST_KEY, value: label, label, ordem });
    if (error) return toast.error(error.message);
    setNovo("");
    qc.invalidateQueries({ queryKey: ["list_options", LIST_KEY] });
  }
  async function del(id: string) {
    if (!confirm("Excluir este tipo?")) return;
    const { error } = await supabase.from("list_options").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["list_options", LIST_KEY] });
  }
  async function saveRename() {
    if (!editing) return;
    const label = editing.label.trim();
    if (!label) return;
    const { error } = await supabase.from("list_options").update({ label, value: label }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["list_options", LIST_KEY] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Settings2 className="mr-1 h-4 w-4" /> Gerenciar tipos</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Tipos de conteúdo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Ex: Podcast, Live, Reels..." onKeyDown={(e) => e.key === "Enter" && add()} />
            <Button onClick={add}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1">
            {tipos.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                {editing && editing.id === t.id ? (
                  <>
                    <Input value={editing.label} onChange={(e) => setEditingLabel(e.target.value)} className="h-8" />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveRename}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{t.label}</span>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing({ id: t.id, label: t.label })}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => del(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </>
                )}
              </div>
            ))}
            {tipos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum tipo cadastrado.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
