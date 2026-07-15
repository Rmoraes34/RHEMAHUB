import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/lib/format";
import { generateSimpleDoc } from "@/lib/doc-pdf";
import { FileDown, Save } from "lucide-react";
import { toast } from "sonner";

interface QuoteBuilderProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  leadId: string | null;
  clientId?: string | null;
  clienteNome: string;
  clienteEmpresa?: string | null;
  clienteContato?: string | null;
  onSaved?: () => void;
}

export function QuoteBuilder({
  open,
  onOpenChange,
  leadId,
  clientId,
  clienteNome,
  clienteEmpresa,
  clienteContato,
  onSaved,
}: QuoteBuilderProps) {
  const qc = useQueryClient();
  const [servico, setServico] = useState("");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: packages = [] } = useQuery({
    queryKey: ["service_packages"],
    queryFn: async () => {
      const { data } = await supabase.from("service_packages").select("*").eq("ativo", true).order("nome");
      return data ?? [];
    },
  });

  const { data: company } = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  function pickPackage(id: string) {
    const p = packages.find((x: any) => x.id === id);
    if (!p) return;
    setServico(p.nome);
    if (!valor) setValor(String(Number(p.valor) || 0));
    if (!descricao && p.descricao) setDescricao(p.descricao);
  }

  const valorNum = Number(valor) || 0;

  async function nextVersao() {
    if (!leadId) return 1;
    const { count } = await supabase
      .from("quotes")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId);
    return (count ?? 0) + 1;
  }

  async function save(): Promise<number | null> {
    if (!servico.trim()) {
      toast.error("Informe o serviço contratado.");
      return null;
    }
    setSaving(true);
    const versao = await nextVersao();
    const item = { nome: servico, categoria: "", descricao, valor: valorNum, quantidade: 1 };
    const { error } = await supabase.from("quotes").insert({
      lead_id: leadId,
      client_id: clientId ?? null,
      status: "enviado",
      titulo: `Proposta — ${clienteEmpresa || clienteNome}`,
      versao,
      cliente_nome: clienteNome,
      cliente_empresa: clienteEmpresa ?? null,
      cliente_contato: clienteContato ?? null,
      itens: [item] as unknown as never,
      subtotal: valorNum,
      desconto: 0,
      total: valorNum,
      validade_dias: 7,
      observacoes: descricao || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return null;
    }
    toast.success(`Orçamento salvo (versão ${versao})`);
    qc.invalidateQueries({ queryKey: ["quotes"] });
    if (leadId) qc.invalidateQueries({ queryKey: ["lead_quotes", leadId] });
    onSaved?.();
    return versao;
  }

  function downloadPdf() {
    const doc = generateSimpleDoc(
      {
        tipo: "ORÇAMENTO",
        cliente_nome: clienteEmpresa || clienteNome,
        servico,
        valor: valorNum,
        descricao,
        created_at: new Date().toISOString(),
      },
      { nome: company?.nome ?? "Rhema Estratégia", cnpj: company?.cnpj, info_fiscal: company?.info_fiscal, logo_url: company?.logo_url },
    );
    doc.save(`orcamento-${(clienteEmpresa || clienteNome).replace(/\s+/g, "-").toLowerCase()}.pdf`);
  }

  async function saveAndClose() {
    const v = await save();
    if (v !== null) onOpenChange(false);
  }

  async function saveAndDownload() {
    const v = await save();
    if (v !== null) downloadPdf();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar orçamento</DialogTitle>
          <DialogDescription>
            {clienteNome}
            {clienteEmpresa ? ` • ${clienteEmpresa}` : ""}
            {clienteContato ? ` • ${clienteContato}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {packages.length > 0 && (
            <div className="space-y-1">
              <Label>Puxar do catálogo (opcional)</Label>
              <Select value="" onValueChange={pickPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço / pacote..." />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} ({formatBRL(Number(p.valor) || 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Serviço contratado*</Label>
            <Input value={servico} onChange={(e) => setServico(e.target.value)} placeholder="Ex: Gestão de redes sociais" />
          </div>

          <div className="space-y-1">
            <Label>Valor da proposta (R$)</Label>
            <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Descrição (o que está incluso, condições, prazo)</Label>
            <Textarea rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-base font-bold text-primary flex justify-between">
            <span>Valor da proposta</span>
            <span>{formatBRL(valorNum)}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" disabled={saving} onClick={saveAndClose}>
            <Save className="mr-2 h-4 w-4" /> Salvar orçamento
          </Button>
          <Button disabled={saving} onClick={saveAndDownload}>
            <FileDown className="mr-2 h-4 w-4" /> Baixar em PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
