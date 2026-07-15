import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTeam() {
  return useQuery({
    queryKey: ["team_members", "select"],
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("id, nome").order("nome");
      return data ?? [];
    },
  });
}
