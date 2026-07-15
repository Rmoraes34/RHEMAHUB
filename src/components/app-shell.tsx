import { useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  FileText,
  Wallet,
  CalendarDays,
  Settings,
  Trash2,
  LogOut,
  Menu,
  Sparkles,
  Search,
  Moon,
  Sun,
  Clapperboard,
  Bot,
  Package,
  UsersRound,
  AppWindow,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { ModuleKey } from "@/lib/modules";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { GlobalSearch } from "@/components/global-search";
import { NotificationBell } from "@/components/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  mod: ModuleKey;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mod: "dashboard" }],
  },
  {
    label: "Administrativo",
    items: [
      { to: "/clientes", label: "Clientes", icon: Users, mod: "clientes" },
      { to: "/crm", label: "CRM", icon: KanbanSquare, mod: "crm" },
      { to: "/financeiro", label: "Financeiro", icon: Wallet, mod: "financeiro" },
      { to: "/contratos", label: "Orçamentos", icon: FileText, mod: "contratos" },
      { to: "/agenda", label: "Agenda", icon: CalendarDays, mod: "agenda" },
      { to: "/equipe", label: "Equipe", icon: UsersRound, mod: "equipe" },
      { to: "/servicos", label: "Serviços & Pacotes", icon: Package, mod: "servicos" },
      { to: "/aplicativos", label: "Aplicativos & Ferramentas", icon: AppWindow, mod: "aplicativos" },
      { to: "/formularios", label: "Formulários & Modelos", icon: ClipboardList, mod: "formularios" },
    ],
  },
  {
    label: "Operacional",
    items: [
      { to: "/cronograma", label: "Cronogramas", icon: Clapperboard, mod: "cronograma" },
      { to: "/ia-clientes", label: "IA dos Clientes", icon: Bot, mod: "ia-clientes" },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { roles, isAdmin, user, signOut, canAccess } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: company } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("logo_url").eq("id", 1).single();
      return data;
    },
  });

  const canSee = (n: NavItem) => canAccess(n.mod);
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-6 py-5 text-lg font-extrabold">
        {company?.logo_url ? (
          <img src={company.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
        ) : (
          <Sparkles className="h-6 w-6 text-sidebar-primary" />
        )}
        Rhema
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {NAV.map((section, i) => {
          const items = section.items.filter(canSee);
          if (items.length === 0) return null;
          return (
            <div key={i} className="space-y-1">
              {section.label && (
                <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
                  {section.label}
                </div>
              )}
              {items.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
        {isAdmin && (
          <div className="space-y-1">
            <Link
              to="/configuracoes"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/configuracoes")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              Configurações
            </Link>
            <Link
              to="/lixeira"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/lixeira")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Trash2 className="h-5 w-5 shrink-0" />
              Lixeira
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden shrink-0 lg:block">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">{sidebar}</div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-10 flex-1 max-w-md items-center gap-2 rounded-lg border bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted"
          >
            <Search className="h-4 w-4" />
            Buscar cliente, lead ou contrato...
          </button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="truncate">{user?.email}</div>
                <div className="text-xs font-normal text-muted-foreground">{roles.join(", ") || "sem perfil"}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/auth" });
                }}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
