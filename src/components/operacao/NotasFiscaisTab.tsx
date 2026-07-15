import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, FileText, Save } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

async function openStorageFile(path: string) {
  const { data, error } = await supabase.storage.from("contracts").createSignedUrl(path, 3600);
  if (error || !data) return toast.error("Não foi possível abrir o arquivo");
  window.open(data.signedUrl, "_blank");
}

export function NotasFiscaisTab({ contract }: { contract: any }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["contract_nfs", contract.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contract_deliveries")
        .select("*")
        .eq("contract_id", contract.id)
        .eq("tipo", "nf")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function del(id: string) {
    if (!confirm("Excluir esta nota fiscal?")) return;
    const { error } = await supabase.from("contract_deliveries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["contract_nfs", contract.id] });
  }

  return (
    <Card className="mt-4 p-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Notas Fiscais</h3>
          <p className="text-xs text-muted-foreground">Repositório de notas fiscais deste contrato. Apenas para histórico — sem integração com o Financeiro.</p>
        </div>
        <NFDialog contractId={contract.id} clientId={contract.client_id} />
      </div>
      <div className="space-y-2">
        {data.map((n: any) => (
          <div key={n.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">{n.descricao || "Nota fiscal"}</div>
              <div className="text-xs text-muted-foreground">{formatDate(n.created_at)}</div>
            </div>
            {n.arquivo_url && (
              <Button variant="outline" size="sm" onClick={() => openStorageFile(n.arquivo_url)}>Abrir</Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => del(n.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma nota fiscal cadastrada.</p>}
      </div>
    </Card>
  );
}

function NFDialog({ contractId, clientId }: { contractId: string; clientId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const path = `${clientId}/nf/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("contracts").upload(path, file, { upsert: true });
      if (error) throw error;
      setArquivo(path);
      toast.success("Arquivo enviado");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar arquivo");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!descricao.trim() && !arquivo) return toast.error("Informe uma descrição ou anexe o arquivo");
    const { error } = await supabase.from("contract_deliveries").insert({
      contract_id: contractId,
      tipo: "nf",
      descricao: descricao.trim() || null,
      arquivo_url: arquivo || null,
      quantidade: 0,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Nota fiscal adicionada");
    setDescricao("");
    setArquivo("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["contract_nfs", contractId] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Adicionar Nota Fiscal</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova nota fiscal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Referente à competência Janeiro/2027" />
          </div>
          <div>
            <Label>Arquivo (PDF ou XML)</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1 h-4 w-4" /> {busy ? "Enviando..." : arquivo ? "Trocar arquivo" : "Enviar arquivo"}
              </Button>
              {arquivo && <span className="text-xs text-muted-foreground">Anexado</span>}
              <input ref={fileRef} type="file" accept=".pdf,.xml,application/pdf,text/xml,application/xml" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy}><Save className="mr-1 h-4 w-4" /> Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
