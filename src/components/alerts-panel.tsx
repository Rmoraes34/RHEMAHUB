import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useInternalAlerts } from "@/lib/use-internal-alerts";

/** Painel de alertas internos exibido no dashboard para avisar o time. */
export function AlertsPanel() {
  const alerts = useInternalAlerts();

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Alertas internos do time
        </h3>
        {alerts.length > 0 && <Badge variant="destructive">{alerts.length}</Badge>}
      </div>
      <ScrollArea className="max-h-80">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-success" />
            Nenhum alerta no momento 🎉
          </div>
        ) : (
          <div className="divide-y">
            {alerts.map((a) => (
              <Link
                key={a.id}
                to={a.to}
                className="flex items-start gap-3 py-3 text-sm hover:bg-muted/50"
              >
                <a.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="font-medium">{a.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.detail}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
