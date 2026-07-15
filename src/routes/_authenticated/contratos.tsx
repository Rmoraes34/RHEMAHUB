import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { formatBRL } from "@/lib/format";
import { FileDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { generateQuotePdf, type QuoteItem } from "@/lib/quote-pdf";

export const Route = createFileRoute("/_authenticated/contratos")({
  component: Orcamentos,
});

function Orcamentos() {
  const qc = useQueryClient();
  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("*, clients(razao_social), leads(nome, empresa)")
        .order("created_at", { ascending: false });
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

  async function deleteQuote(q: any) {
    const { error } = await supabase.from("quotes").delete().eq("id", q.id);
    if (error) return toast.error(error.message);
    toast.success("Orçamento excluído");
    qc.invalidateQueries({ queryKey: ["quotes"] });
  }

  function downloadQuote(q: any) {
    const doc = generateQuotePdf(
      {
        titulo: q.titulo,
        versao: q.versao,
        cliente_nome: q.cliente_nome ?? q.clients?.razao_social ?? q.leads?.nome ?? "Cliente",
        cliente_empresa: q.cliente_empresa,
        cliente_contato: q.cliente_contato,
        itens: (q.itens ?? []) as QuoteItem[],
        subtotal: Number(q.subtotal) || 0,
        desconto: Number(q.desconto) || 0,
        total: Number(q.total) || 0,
        validade_dias: q.validade_dias ?? 7,
        observacoes: q.observacoes,
        created_at: q.created_at,
      },
      { nome: company?.nome ?? "Rhema Estratégia", cnpj: company?.cnpj, info_fiscal: company?.info_fiscal, logo_url: company?.logo_url },
    );
    doc.save(`orcamento-v${q.versao}.pdf`);
  }

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        description="Todos os orçamentos gerados no CRM, de todos os clientes"
      />

      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-lg font-bold">Orçamentos enviados</h2>
        <Badge variant="secondary">{quotes.length}</Badge>
      </div>
      <Card className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proposta</TableHead>
              <TableHead>Cliente / Lead</TableHead>
              <TableHead>Versão</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((q: any) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">{q.titulo}</TableCell>
                <TableCell>
                  {q.clients?.razao_social ?? q.cliente_empresa ?? q.cliente_nome ?? q.leads?.nome ?? "—"}
                </TableCell>
                <TableCell>v{q.versao}</TableCell>
                <TableCell>{formatBRL(q.total)}</TableCell>
                <TableCell className="text-sm">{q.validade_dias} dias</TableCell>
                <TableCell><Badge variant="outline">Orçamento enviado</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadQuote(q)} aria-label="Baixar PDF">
                      <FileDown className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Excluir orçamento">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir "{q.titulo}" (v{q.versao})? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteQuote(q)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {quotes.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum orçamento gerado ainda. Gere no CRM.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
