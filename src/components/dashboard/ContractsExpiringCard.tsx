import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";

function daysUntil(d: string) {
  const today = new Date(new Date().toDateString()).getTime();
  const target = new Date(d + "T00:00:00").getTime();
  return Math.round((target - today) / 86400000);
}

export function ContractsExpiringCard() {
  const { data = [] } = useQuery({
    queryKey: ["contracts_expiring"],
    queryFn: async () => {
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      const { data } = await supabase
        .from("contracts")
        .select("id, titulo, client_id, data_fim, status, clients(razao_social)")
        .in("status", ["ativo", "assinado"])
        .not("data_fim", "is", null)
        .lte("data_fim", in30.toISOString().slice(0, 10))
        .neq("tipo", "nf")
        .order("data_fim", { ascending: true });
      return data ?? [];
    },
  });

  if (!data.length) return null;

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-5 w-5 text-warning" />
        <h3 className="font-semibold">Contratos próximos do vencimento</h3>
        <Badge variant="secondary">{data.length}</Badge>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {data.map((c: any) => {
          const dias = daysUntil(c.data_fim);
          const vencido = dias < 0;
          return (
            <Link
              key={c.id}
              to="/clientes/$id"
              params={{ id: c.client_id }}
              className="flex items-center gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50"
            >
              <div className="flex-1">
                <div className="font-medium">{c.clients?.razao_social ?? "Cliente"}</div>
                <div className="text-xs text-muted-foreground">{c.titulo}</div>
              </div>
              {vencido ? (
                <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" /> Vencido há {Math.abs(dias)} dia(s)</Badge>
              ) : (
                <Badge variant={dias <= 7 ? "destructive" : "outline"}>vence em {dias} dia(s)</Badge>
              )}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
