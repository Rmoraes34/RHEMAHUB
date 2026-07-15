import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { defaultModulesForRoles, type ModuleKey } from "@/lib/modules";

export type AppRole = "admin" | "comercial" | "atendimento" | "financeiro";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  modules: ModuleKey[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  canFinance: boolean;
  canAccess: (module: ModuleKey) => boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [customModules, setCustomModules] = useState<ModuleKey[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadRoles(userId: string | undefined) {
    if (!userId) {
      setRoles([]);
      setCustomModules(null);
      return;
    }
    const [{ data: roleData }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("modulos").eq("user_id", userId).maybeSingle(),
    ]);
    setRoles((roleData ?? []).map((r) => r.role as AppRole));
    const mods = (profile as any)?.modulos;
    setCustomModules(Array.isArray(mods) ? (mods as ModuleKey[]) : null);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setTimeout(() => loadRoles(s?.user?.id), 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      loadRoles(data.session?.user?.id).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");
  const modules = customModules ?? defaultModulesForRoles(roles);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    roles,
    modules,
    loading,
    hasRole: (role) => roles.includes(role),
    isAdmin,
    canFinance: roles.includes("admin") || roles.includes("financeiro"),
    canAccess: (module) => isAdmin || modules.includes(module),
    refreshRoles: () => loadRoles(session?.user?.id),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
