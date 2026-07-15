import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, RotateCcw, Users, Target } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/lixeira")({
  component: Trash,
});

type TableName = "clients" | "leads";

interface TrashItem {
  table: TableName;
  id: string;
  label: string;
  deleted_at: string;
}

const DAY = 86400000;

function daysLeft(deletedAt: string): number {
  const purge = new Date(deletedAt).getTime() + 30 * DAY;
  return Math.max(0, Math.ceil((purge - Date.now()) / DAY));
}

const META: Record<TableName, { label: string; icon: typeof Users }> = {
  clients: { label: "Cliente", icon: Users },
  leads: { label: "Lead", icon: Target },
};

function Trash() {
  const qc = useQueryClient();

  const { data: items = [] } = useQuery({
    queryKey: ["trash"],
    queryFn: async () => {
      const [clients, leads] = await Promise.all([
        supabase.from("clients").select("id, razao_social, deleted_at").not("deleted_at", "is", null),
        supabase.from("leads").select("id, nome, deleted_at").not("deleted_at", "is", null),
      ]);
      const out: TrashItem[] = [];
      for (const c of clients.data ?? [])
        out.push({ table: "clients", id: c.id, label: c.razao_social, deleted_at: c.deleted_at! });
      for (const l of leads.data ?? [])
        out.push({ table: "leads", id: l.id, label: l.nome, deleted_at: l.deleted_at! });
      return out.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
    },
  });

  async function restore(item: TrashItem) {
    const { error } = await supabase.from(item.table).update({ deleted_at: null }).eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Item restaurado");
    qc.invalidateQueries({ queryKey: ["trash"] });
    qc.invalidateQueries({ queryKey: [item.table === "clients" ? "clients" : item.table] });
  }

  async function purge(item: TrashItem) {
    const { error } = await supabase.from(item.table).delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Item removido definitivamente");
    qc.invalidateQueries({ queryKey: ["trash"] });
  }

  return (
    <div>
      <PageHeader
        title="Lixeira"
        description="Itens excluídos ficam aqui por 30 dias antes de serem removidos definitivamente"
      />

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
          <Trash2 className="h-8 w-8" />
          A lixeira está vazia 🎉
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const Icon = META[item.table].icon;
            const left = daysLeft(item.deleted_at);
            return (
              <Card key={item.table + item.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {META[item.table].label} • excluído em {formatDate(item.deleted_at)}
                  </div>
                </div>
                <Badge variant={left <= 5 ? "destructive" : "secondary"}>
                  {left} {left === 1 ? "dia" : "dias"} restantes
                </Badge>
                <Button variant="outline" size="sm" onClick={() => restore(item)}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Restaurar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label="Excluir definitivamente">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <strong>{item.label}</strong> será removido permanentemente e não poderá ser recuperado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => purge(item)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir definitivamente
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
