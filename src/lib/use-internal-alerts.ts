import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Package2, UserX, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export type AlertKind = "contract" | "deliverable" | "lead";

export interface InternalAlert {
  id: string;
  kind: AlertKind;
  icon: LucideIcon;
  title: string;
  detail: string;
  to: string;
}

const DAY = 86400000;

/** Hook central: reúne todos os alertas internos do sistema (contratos, entregáveis, leads). */
export function useInternalAlerts() {
  const { data: contracts = [] } = useQuery({
    queryKey: ["notif", "contracts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contracts")
        .select("id, titulo, data_fim, status")
        .not("data_fim", "is", null);
      return data ?? [];
    },
  });


  const { data: deliverables = [] } = useQuery({
    queryKey: ["notif", "deliverables"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deliverables")
        .select("id, titulo, data_prazo, status, client_id")
        .neq("status", "aprovado")
        .not("data_prazo", "is", null);
      return data ?? [];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["notif", "leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, nome, empresa, updated_at")
        .is("deleted_at", null)
        .is("converted_client_id", null);
      return data ?? [];
    },
  });

  return useMemo<InternalAlert[]>(() => {
    const now = Date.now();
    const out: InternalAlert[] = [];

    for (const c of contracts) {
      if (!c.data_fim || c.status === "encerrado") continue;
      const diff = (new Date(c.data_fim + "T00:00:00").getTime() - now) / DAY;
      if (diff <= 30 && diff >= -365) {
        out.push({
          id: "ct" + c.id,
          kind: "contract",
          icon: FileText,
          title: diff < 0 ? "Contrato vencido" : "Contrato vencendo",
          detail: `${c.titulo} • ${formatDate(c.data_fim)}`,
          to: "/contratos",
        });
      }
    }
    for (const d of deliverables) {
      if (!d.data_prazo) continue;
      if (new Date(d.data_prazo + "T00:00:00").getTime() < now) {
        out.push({
          id: "dl" + d.id,
          kind: "deliverable",
          icon: Package2,
          title: "Entregável atrasado",
          detail: `${d.titulo} • ${formatDate(d.data_prazo)}`,
          to: d.client_id ? `/clientes/${d.client_id}` : "/clientes",
        });
      }
    }
    for (const l of leads) {
      const diff = (now - new Date(l.updated_at).getTime()) / DAY;
      if (diff >= 7) {
        out.push({
          id: "ld" + l.id,
          kind: "lead",
          icon: UserX,
          title: "Lead parado sem contato",
          detail: `${l.nome}${l.empresa ? " • " + l.empresa : ""} • ${Math.floor(diff)}d`,
          to: "/crm",
        });
      }
    }
    return out;
  }, [contracts, deliverables, leads]);
}
