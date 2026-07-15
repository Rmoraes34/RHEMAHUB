import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles } from "lucide-react";

export function PendingApproval() {
  const { user, signOut } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-8 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Clock className="h-7 w-7" />
        </div>
        <div className="mb-1 flex items-center justify-center gap-2 text-sm font-bold text-primary">
          <Sparkles className="h-4 w-4" /> Rhema Estratégia
        </div>
        <h1 className="text-2xl font-bold">Cadastro aguardando aprovação</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sua conta{user?.email ? ` (${user.email})` : ""} foi criada com sucesso, mas ainda precisa
          ser aprovada por um administrador antes de você acessar a plataforma.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Assim que seu acesso for liberado, basta entrar novamente.
        </p>
        <Button variant="outline" className="mt-6 w-full" onClick={() => signOut()}>
          Sair
        </Button>
      </Card>
    </div>
  );
}
