import { supabase } from "@/integrations/supabase/client";

// Fases de produção (usadas no Kanban da visão geral).
export const PRODUCTION_PHASES = [
  { value: "roteiro", label: "Roteiro" },
  { value: "gravado", label: "Gravado" },
  { value: "edicao", label: "Em edição" },
  { value: "revisao", label: "Revisão" },
  { value: "finalizado", label: "Finalizado" },
] as const;

// Status de publicação (usados na lista/relatório dentro do cliente).
export const PUBLICATION_STATUSES = [
  { value: "pendente", label: "Pendente" },
  { value: "edicao", label: "Em edição" },
  { value: "validacao", label: "Validação" },
  { value: "aprovado", label: "Aprovado" },
  { value: "agendado", label: "Agendado" },
  { value: "publicado", label: "Publicado" },
] as const;

// Status relevantes por tipo de item.
export const POSTAGEM_STATUSES = PUBLICATION_STATUSES.filter((s) =>
  ["pendente", "agendado", "publicado"].includes(s.value),
);
export const EDICAO_STATUSES = PUBLICATION_STATUSES.filter((s) =>
  ["pendente", "edicao", "validacao", "aprovado", "publicado"].includes(s.value),
);

export function statusesForTipo(tipo: string) {
  return tipo === "edicao" ? EDICAO_STATUSES : POSTAGEM_STATUSES;
}

// Colunas do Kanban da visão geral (espelham os nomes dos dropdowns do cliente).
export const POSTAGEM_COLUMNS = [
  { value: "pendente", label: "Pendente", droppable: true },
  { value: "agendado", label: "Agendado", droppable: true },
  { value: "publicado", label: "Publicado", droppable: true },
  { value: "atrasado", label: "Atrasado", droppable: false },
] as const;

export const EDICAO_COLUMNS = [
  { value: "roteiro", label: "Roteiro", droppable: true },
  { value: "gravado", label: "Gravado", droppable: true },
  { value: "edicao", label: "Em edição", droppable: true },
  { value: "aprovado", label: "Aprovado", droppable: true },
  { value: "atrasado", label: "Atrasado", droppable: false },
] as const;

export function columnsForMode(mode: "postagem" | "edicao") {
  return mode === "edicao" ? EDICAO_COLUMNS : POSTAGEM_COLUMNS;
}

// Em qual coluna do Kanban o item deve aparecer.
export function columnOf(p: any, mode: "postagem" | "edicao"): string {
  if (isOverdue(p)) return "atrasado";
  if (mode === "postagem") {
    if (isPublished(p)) return "publicado";
    return p?.status === "pendente" ? "pendente" : "agendado";
  }
  // edição
  if (isPublished(p) || p?.status === "aprovado") return "aprovado";
  const fase = p?.fase || "roteiro";
  if (fase === "gravado") return "gravado";
  if (fase === "edicao" || fase === "revisao") return "edicao";
  return "roteiro";
}

// Move um card para a coluna de destino, ajustando fase/status conforme o modo.
export async function moveToColumn(id: string, mode: "postagem" | "edicao", col: string) {
  if (mode === "postagem") {
    return updatePublicationStatus(id, col);
  }
  if (col === "aprovado") {
    return supabase
      .from("content_posts")
      .update({ status: "aprovado", fase: "revisao", entregue: false, data_entregue: null })
      .eq("id", id);
  }
  return updateProductionPhase(id, col);
}

export function isPublished(p: any): boolean {
  return p?.status === "publicado" || p?.entregue === true;
}

// "Atrasado" só se aplica a itens Agendados cuja data já passou e que ainda não foram publicados.
// Status de produção (Em edição, Validação, Aprovado) representam trabalho em andamento e nunca ficam atrasados.
export function isOverdue(p: any): boolean {
  if (isPublished(p)) return false;
  if ((p?.status || "agendado") !== "agendado") return false;
  if (!p?.data_post) return false;
  return new Date(p.data_post + "T00:00:00") < new Date(new Date().toDateString());
}

// Rótulo de status para a lista/relatório do cliente (inclui "Atrasado" calculado).
export function statusLabel(p: any): string {
  if (isPublished(p)) return "Publicado";
  if (isOverdue(p)) return "Atrasado";
  const found = PUBLICATION_STATUSES.find((s) => s.value === p?.status);
  return found?.label ?? "Agendado";
}

export function phaseLabel(fase: string): string {
  return PRODUCTION_PHASES.find((f) => f.value === fase)?.label ?? "Roteiro";
}

// ---- Sincronização entre as duas camadas (fase de produção <-> status de publicação) ----

// Muda o STATUS de publicação e sincroniza a fase de produção.
export async function updatePublicationStatus(id: string, status: string) {
  const patch: any = { status };
  if (status === "publicado") {
    patch.entregue = true;
    patch.data_entregue = new Date().toISOString().slice(0, 10);
    patch.fase = "finalizado";
  } else {
    patch.entregue = false;
    patch.data_entregue = null;
    // Se estava finalizado, volta para revisão para refletir que não está mais publicado.
    patch.fase = "revisao";
  }
  return supabase.from("content_posts").update(patch).eq("id", id);
}

// Muda a FASE de produção (Kanban) e sincroniza o status de publicação.
export async function updateProductionPhase(id: string, fase: string) {
  const patch: any = { fase };
  if (fase === "finalizado") {
    patch.status = "publicado";
    patch.entregue = true;
    patch.data_entregue = new Date().toISOString().slice(0, 10);
  } else {
    patch.status = "agendado";
    patch.entregue = false;
    patch.data_entregue = null;
  }
  return supabase.from("content_posts").update(patch).eq("id", id);
}
