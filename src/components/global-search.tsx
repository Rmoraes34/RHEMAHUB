import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Users, KanbanSquare, FileText } from "lucide-react";

interface Result {
  id: string;
  label: string;
  type: "cliente" | "lead" | "contrato";
}

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const like = `%${query}%`;
      const [clients, leads, contracts] = await Promise.all([
        supabase.from("clients").select("id,razao_social").is("deleted_at", null).ilike("razao_social", like).limit(5),
        supabase.from("leads").select("id,nome,empresa").is("deleted_at", null).ilike("nome", like).limit(5),
        supabase.from("contracts").select("id,titulo").ilike("titulo", like).limit(5),
      ]);
      const r: Result[] = [
        ...(clients.data ?? []).map((c) => ({ id: c.id, label: c.razao_social, type: "cliente" as const })),
        ...(leads.data ?? []).map((l) => ({ id: l.id, label: `${l.nome}${l.empresa ? " — " + l.empresa : ""}`, type: "lead" as const })),
        ...(contracts.data ?? []).map((c) => ({ id: c.id, label: c.titulo, type: "contrato" as const })),
      ];
      setResults(r);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function go(r: Result) {
    onOpenChange(false);
    setQuery("");
    if (r.type === "cliente") navigate({ to: "/clientes/$id", params: { id: r.id } });
    else if (r.type === "lead") navigate({ to: "/crm" });
    else navigate({ to: "/contratos" });
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar cliente, lead ou contrato..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        {results.length > 0 && (
          <CommandGroup heading="Resultados">
            {results.map((r) => (
              <CommandItem key={r.type + r.id} value={r.type + r.label + r.id} onSelect={() => go(r)}>
                {r.type === "cliente" && <Users className="mr-2 h-4 w-4" />}
                {r.type === "lead" && <KanbanSquare className="mr-2 h-4 w-4" />}
                {r.type === "contrato" && <FileText className="mr-2 h-4 w-4" />}
                <span>{r.label}</span>
                <span className="ml-auto text-xs capitalize text-muted-foreground">{r.type}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
