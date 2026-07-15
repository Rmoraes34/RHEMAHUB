import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export function useClientContracts(clientId: string) {
  return useQuery({
    queryKey: ["client_contracts_op", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contracts")
        .select("*")
        .eq("client_id", clientId)
        .neq("tipo", "nf")
        .order("data_inicio", { ascending: false, nullsFirst: false });
      return (data ?? []).filter((c: any) => (c.tipo ?? "contrato") !== "nf");
    },
  });
}

export function ContractSelector({
  clientId,
  value,
  onChange,
}: {
  clientId: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { data: contracts = [], isLoading } = useClientContracts(clientId);

  useEffect(() => {
    if (isLoading) return;
    if (value && contracts.find((c: any) => c.id === value)) return;
    // Auto-select: se há apenas um contrato, ou o ativo mais recente.
    const ativos = contracts.filter((c: any) => c.status === "ativo" || c.status === "assinado");
    const pick = (ativos[0] ?? contracts[0])?.id ?? null;
    if (pick !== value) onChange(pick);
  }, [contracts, isLoading]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando contratos...</p>;
  if (contracts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        Nenhum contrato cadastrado. Crie um contrato na aba <strong>Cadastro → Contratos</strong> para iniciar a operação.
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
      <span className="text-xs font-semibold uppercase text-muted-foreground">Contrato Ativo</span>
      <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)}>
        <SelectTrigger className="min-w-[280px] max-w-[520px]"><SelectValue placeholder="Selecionar contrato" /></SelectTrigger>
        <SelectContent>
          {contracts.map((c: any) => (
            <SelectItem key={c.id} value={c.id}>
              {c.titulo} {c.data_inicio ? `| ${formatDate(c.data_inicio)}` : ""}
              {c.data_fim ? ` – ${formatDate(c.data_fim)}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (() => {
        const c = contracts.find((x: any) => x.id === value);
        if (!c) return null;
        return <Badge variant="secondary" className="capitalize">{c.status}</Badge>;
      })()}
    </div>
  );
}
