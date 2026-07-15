import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { GerenciarTiposDialog, useTiposConteudo } from "./GerenciarTiposDialog";
import { GerarCronogramaWizard } from "./GerarCronogramaWizard";
import type { PlanoItem } from "@/lib/operacao";

export function useDeliverablesPlan(contractId: string | null) {
  return useQuery({
    queryKey: ["deliverables_plan", contractId],
    enabled: !!contractId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deliverables_plan")
        .select("*")
        .eq("contract_id", contractId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });
}

export function EntregaveisSimples({ clientId, contract }: { clientId: string; contract: any }) {
  const qc = useQueryClient();
  const contractId = contract.id;
  const { data: plan } = useDeliverablesPlan(contractId);
  const { data: tipos = [] } = useTiposConteudo();

  const [itens, setItens] = useState<PlanoItem[]>([]);

  useEffect(() => {
    if (plan?.itens) {
      const arr = (plan.itens as any[]).map((i: any) => ({
        tipo: i.tipo ?? i.categoria ?? "",
        quantidade: Number(i.quantidade) || 0,
      }));
      setItens(arr);
    } else {
      setItens([]);
    }
  }, [plan?.id]);

  function addLinha() {
    setItens([...itens, { tipo: tipos[0]?.value ?? "", quantidade: 1 }]);
  }
  function removeLinha(i: number) {
    setItens(itens.filter((_, idx) => idx !== i));
  }
  function updateLinha(i: number, patch: Partial<PlanoItem>) {
    setItens(itens.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  async function salvar() {
    const validos = itens.filter((it) => it.tipo && it.quantidade > 0);
    const payload = {
      client_id: clientId,
      contract_id: contractId,
      itens: validos,
      dias_producao: plan?.dias_producao ?? [],
      dias_edicao: plan?.dias_edicao ?? [],
      dias_publicacao: plan?.dias_publicacao ?? [],
      equipe: plan?.equipe ?? {},
    };
    const { error } = plan
      ? await supabase.from("deliverables_plan").update(payload).eq("id", plan.id)
      : await supabase.from("deliverables_plan").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Entregáveis salvos");
    qc.invalidateQueries({ queryKey: ["deliverables_plan", contractId] });
  }

  const totalConteudos = itens.reduce((s, i) => s + (Number(i.quantidade) || 0), 0);

  return (
    <Card className="mt-4 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">Entregáveis do contrato</h3>
          <p className="text-xs text-muted-foreground">
            Informe apenas o tipo de conteúdo e a quantidade. O fluxo (Produção → Edição → Postagens) é o mesmo para todos.
          </p>
        </div>
        <div className="flex gap-2">
          <GerenciarTiposDialog />
          <GerarCronogramaWizard clientId={clientId} contract={contract} itens={itens} plan={plan ?? null} />
        </div>
      </div>

      <div className="space-y-2">
        {itens.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_auto] items-center gap-2">
            <Select value={it.tipo} onValueChange={(v) => updateLinha(i, { tipo: v })}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                {tipos.map((t: any) => <SelectItem key={t.id} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              value={it.quantidade}
              onChange={(e) => updateLinha(i, { quantidade: Number(e.target.value) || 0 })}
            />
            <Button variant="ghost" size="icon" onClick={() => removeLinha(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {itens.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum entregável cadastrado ainda.</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={addLinha}><Plus className="mr-1 h-4 w-4" /> Adicionar entregável</Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Total: <strong>{totalConteudos}</strong> conteúdos</span>
          <Button onClick={salvar}><Save className="mr-1 h-4 w-4" /> Salvar</Button>
        </div>
      </div>
    </Card>
  );
}
