import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { PendingApproval } from "@/components/pending-approval";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, roles } = useAuth();
  if (!loading && roles.length === 0) {
    return <PendingApproval />;
  }
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
