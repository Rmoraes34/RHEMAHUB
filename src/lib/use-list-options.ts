import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ListOption = { value: string; label: string };

/**
 * Lê uma lista configurável (gerenciada em Configurações → Listas) do banco.
 * Enquanto os dados não chegam — ou se a lista estiver vazia — usa o fallback.
 */
export function useListOptions(listKey: string, fallback: readonly ListOption[]): ListOption[] {
  const { data } = useQuery({
    queryKey: ["list_options", listKey],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("list_options")
        .select("value,label,ordem")
        .eq("list_key", listKey)
        .order("ordem");
      return (data ?? []) as { value: string; label: string; ordem: number }[];
    },
  });
  if (!data || data.length === 0) return [...fallback];
  return data.map((d) => ({ value: d.value, label: d.label }));
}
