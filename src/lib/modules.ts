// Módulos da plataforma usados para permissões granulares por usuário.
export const MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "clientes", label: "Clientes" },
  { key: "crm", label: "CRM" },
  { key: "financeiro", label: "Financeiro" },
  { key: "contratos", label: "Orçamentos" },
  { key: "agenda", label: "Agenda" },
  { key: "equipe", label: "Equipe" },
  { key: "servicos", label: "Serviços & Pacotes" },
  { key: "aplicativos", label: "Aplicativos & Ferramentas" },
  { key: "formularios", label: "Formulários & Modelos" },
  
  { key: "cronograma", label: "Cronogramas" },
  { key: "ia-clientes", label: "IA dos Clientes" },
  { key: "base-dados", label: "Base de Dados do Cliente" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export const ALL_MODULE_KEYS = MODULES.map((m) => m.key) as ModuleKey[];

// Padrão de módulos liberados por perfil (role).
export const ROLE_DEFAULT_MODULES: Record<string, ModuleKey[]> = {
  admin: ALL_MODULE_KEYS,
  comercial: ["dashboard", "clientes", "crm", "contratos", "agenda", "servicos", "aplicativos", "formularios", "base-dados"],
  atendimento: ["dashboard", "clientes", "agenda", "cronograma", "ia-clientes", "aplicativos", "formularios", "base-dados"],
  financeiro: ["dashboard", "clientes", "financeiro", "contratos", "aplicativos"],
};

export function defaultModulesForRoles(roles: string[]): ModuleKey[] {
  const set = new Set<ModuleKey>();
  roles.forEach((r) => (ROLE_DEFAULT_MODULES[r] ?? []).forEach((m) => set.add(m)));
  return [...set];
}
