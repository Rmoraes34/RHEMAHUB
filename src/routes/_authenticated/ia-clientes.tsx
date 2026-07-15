import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { askClientAi } from "@/lib/ai.functions";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bot, ExternalLink, FolderOpen, NotebookPen, ArrowRight, Send, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ia-clientes")({
  component: IaClientesPage,
});

function IaClientesPage() {
  const [chatClient, setChatClient] = useState<{ id: string; nome: string } | null>(null);
  const { data: clients = [] } = useQuery({
    queryKey: ["ia-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, razao_social, drive_url, notion_url, ai_notes, status")
        .is("deleted_at", null)
        .order("razao_social");
      return data ?? [];
    },
  });

  return (
    <div>
      <PageHeader
        title="IA dos Clientes"
        description="Converse com a IA de cada cliente, alimentada pelos dados cadastrados (Dados, Base de Dados e observações internas)."
      />
      <Card className="mb-6 flex items-start gap-3 border-primary/30 bg-primary/5 p-4">
        <Bot className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          A IA usa o provedor configurado em <span className="font-medium">Configurações → Integrações de IA</span>. O
          contexto vem dos Dados do cliente, da Base de Dados e das observações internas. Registre reuniões na Base de
          Dados para melhorar as respostas.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((c) => (
          <Card key={c.id} className="flex flex-col p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold">{c.razao_social}</h3>
              <Badge variant={c.status === "ativo" ? "default" : "outline"} className="capitalize">{c.status}</Badge>
            </div>
            <div className="mb-3 space-y-1 text-sm">
              <SourceLink icon={FolderOpen} label="Google Drive" url={c.drive_url} />
              <SourceLink icon={NotebookPen} label="Notion" url={c.notion_url} />
            </div>
            {c.ai_notes ? (
              <p className="mb-3 line-clamp-3 text-xs text-muted-foreground">{c.ai_notes}</p>
            ) : (
              <p className="mb-3 text-xs italic text-muted-foreground">Sem notas de contexto para IA.</p>
            )}
            <div className="mt-auto space-y-2">
              <Button size="sm" className="w-full" onClick={() => setChatClient({ id: c.id, nome: c.razao_social })}>
                <MessageSquare className="mr-2 h-4 w-4" /> Conversar com IA
              </Button>
              <Link to="/clientes/$id" params={{ id: c.id }}>
                <Button variant="outline" size="sm" className="w-full">
                  Gerenciar fontes <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
        {clients.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>}
      </div>

      {chatClient && <ChatDialog client={chatClient} onClose={() => setChatClient(null)} />}
    </div>
  );
}

function ChatDialog({ client, onClose }: { client: { id: string; nome: string }; onClose: () => void }) {
  const ask = useServerFn(askClientAi);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await ask({ data: { clientId: client.id, messages: next } });
      setMessages([...next, { role: "assistant", content: r.text }]);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao consultar a IA");
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> IA — {client.nome}</DialogTitle>
        </DialogHeader>
        <div className="flex h-80 flex-col gap-3 overflow-y-auto rounded-lg border bg-muted/30 p-3">
          {messages.length === 0 && (
            <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
              Pergunte algo sobre este cliente. Ex: "Resuma o histórico" ou "Qual o tom de voz preferido?"
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Pensando...
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Digite sua pergunta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <Button onClick={send} disabled={loading}><Send className="h-4 w-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SourceLink({ icon: Icon, label, url }: { icon: typeof FolderOpen; label: string; url?: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          {label} <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        <span className="text-muted-foreground">{label}: não configurado</span>
      )}
    </div>
  );
}
