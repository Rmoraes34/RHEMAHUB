// Categorias de serviço usadas em Tarefas, Cronograma de Edições, Entregáveis e Catálogo.
export const SERVICE_CATEGORIES = [
  "Social Media",
  "Identidade Visual / Branding",
  "Site / Landing Page",
  "Estratégia / Consultoria",
  "Audiovisual",
  "Tráfego Pago",
  "Outro",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

// Sugestões de "Atividade específica" por categoria (o usuário pode digitar uma nova).
export const ACTIVITY_SUGGESTIONS: Record<string, string[]> = {
  "Social Media": ["Criar carrossel", "Editar Reels", "Criar post estático", "Escrever legenda/copy", "Gravar stories", "Planejar pauta"],
  "Identidade Visual / Branding": ["Criar logo", "Definir paleta de cores", "Criar manual de marca", "Criar templates"],
  "Site / Landing Page": ["Criar wireframe", "Desenvolver página", "Escrever copy do site", "Revisar UX/UI"],
  "Estratégia / Consultoria": ["Criar diagnóstico", "Montar plano de ação", "Preparar mentoria/reunião estratégica"],
  "Audiovisual": ["Gravar vídeo", "Editar vídeo", "Dirigir captação"],
  "Tráfego Pago": ["Configurar campanha", "Criar criativo de anúncio", "Analisar métricas", "Ajustar segmentação"],
  "Outro": [],
};

export function activitySuggestions(categoria: string): string[] {
  return ACTIVITY_SUGGESTIONS[categoria] ?? [];
}

// Status do fluxo de produção do Cronograma de Edições (visão Kanban).
export const EDITION_STATUSES = [
  { value: "roteiro", label: "Roteiro" },
  { value: "gravado", label: "Gravado" },
  { value: "em edicao", label: "Em edição" },
  { value: "revisao", label: "Revisão" },
  { value: "finalizado", label: "Finalizado" },
] as const;

// Status de tarefas operacionais.
export const TASK_STATUSES = [
  { value: "pendente", label: "Pendente" },
  { value: "em andamento", label: "Em andamento" },
  { value: "em revisao", label: "Em revisão" },
  { value: "concluida", label: "Concluída" },
] as const;

export const TASK_PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
] as const;
