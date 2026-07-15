import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useInternalAlerts } from "@/lib/use-internal-alerts";

/** Central de notificações unificada: reúne todos os alertas do sistema. */
export function NotificationBell() {
  const alerts = useInternalAlerts();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {alerts.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {alerts.length > 9 ? "9+" : alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notificações</div>
        <ScrollArea className="max-h-96">
          {alerts.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum alerta no momento 🎉
            </p>
          ) : (
            <div className="divide-y">
              {alerts.map((a) => (
                <Link
                  key={a.id}
                  to={a.to}
                  className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-muted/50"
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
      </PopoverContent>
    </Popover>
  );
}
