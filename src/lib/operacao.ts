import { supabase } from "@/integrations/supabase/client";

// Etapas do fluxo consolidado.
export const ETAPAS = [
  { value: "producao", label: "Produção" },
  { value: "edicao", label: "Edição" },
  { value: "postagem", label: "Postagem" },
  { value: "publicado", label: "Publicado" },
] as const;

export const STATUS_PRODUCAO = [
  { value: "briefing", label: "Briefing" },
  { value: "roteiro", label: "Roteiro" },
  { value: "gravacao", label: "Gravação" },
  { value: "gravado", label: "Gravado" },
] as const;

export const STATUS_EDICAO = [
  { value: "pendente", label: "Pendente" },
  { value: "edicao", label: "Em edição" },
  { value: "editado", label: "Editado" },
  { value: "validado", label: "Validado" },
  { value: "aprovado", label: "Aprovado" },
] as const;

export const STATUS_POSTAGEM = [
  { value: "pendente", label: "Pendente" },
  { value: "agendado", label: "Agendado" },
  { value: "publicado", label: "Publicado" },
] as const;

// Colunas do Kanban geral (Cronograma).
export const KANBAN_COLUMNS = [
  { value: "producao", label: "Produção" },
  { value: "edicao", label: "Em edição" },
  { value: "validacao", label: "Validação" },
  { value: "agendado", label: "Agendado" },
  { value: "publicado", label: "Publicado" },
  { value: "atrasado", label: "Atrasado" },
] as const;

export function isOverdueOp(p: any): boolean {
  if (p?.etapa_atual === "publicado") return false;
  const ref = p?.data_publicacao || p?.data_post;
  if (!ref) return false;
  return new Date(ref + "T00:00:00") < new Date(new Date().toDateString());
}

export function columnOfOp(p: any): string {
  if (isOverdueOp(p)) return "atrasado";
  const etapa = p?.etapa_atual || "producao";
  if (etapa === "publicado") return "publicado";
  if (etapa === "postagem") return p?.status_postagem === "publicado" ? "publicado" : "agendado";
  if (etapa === "edicao") {
    if (["validado", "aprovado"].includes(p?.status_edicao)) return "validacao";
    return "edicao";
  }
  return "producao";
}

export function etapaLabel(v: string) {
  return ETAPAS.find((e) => e.value === v)?.label ?? v;
}

export function responsavelDaEtapa(p: any): string | null {
  const etapa = p?.etapa_atual || "producao";
  if (etapa === "edicao") return p?.team_members_editor?.nome ?? p?.editor_member?.nome ?? null;
  if (etapa === "postagem" || etapa === "publicado")
    return p?.team_members_postador?.nome ?? p?.postador_member?.nome ?? null;
  return p?.team_members?.nome ?? p?.assignee_member?.nome ?? null;
}

// Aplica transições ao mudar status.
export function patchForStatusProducao(status: string) {
  const patch: any = { status_producao: status };
  if (status === "gravado") {
    patch.etapa_atual = "edicao";
    patch.status_edicao = "pendente";
  } else {
    patch.etapa_atual = "producao";
  }
  return patch;
}

export function patchForStatusEdicao(status: string) {
  const patch: any = { status_edicao: status };
  if (status === "aprovado") {
    patch.etapa_atual = "postagem";
    patch.status_postagem = "pendente";
  } else {
    patch.etapa_atual = "edicao";
  }
  return patch;
}

export function patchForStatusPostagem(status: string) {
  const patch: any = { status_postagem: status };
  if (status === "publicado") {
    patch.etapa_atual = "publicado";
    patch.entregue = true;
    patch.status = "publicado";
    patch.data_entregue = new Date().toISOString().slice(0, 10);
  } else {
    patch.etapa_atual = "postagem";
    patch.entregue = false;
    patch.status = "agendado";
    patch.data_entregue = null;
  }
  return patch;
}

export async function updateContentPost(id: string, patch: any) {
  return supabase.from("content_posts").update(patch).eq("id", id);
}

// --- Geração automática ---

export type PlanoItem = { tipo: string; quantidade: number };
export type EquipeOp = {
  copywriter?: string | null;
  videomaker?: string | null;
  designer?: string | null;
  editor?: string | null;
  social_media?: string | null;
};

export function datasNoPeriodo(inicio: Date, fim: Date, dias: number[]): Date[] {
  if (!dias.length) return [];
  const set = new Set(dias);
  const out: Date[] = [];
  const cur = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  while (cur <= fim) {
    if (set.has(cur.getDay())) out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function anteriorEm(ref: Date, dias: number[]): Date | null {
  if (!dias.length) return null;
  const set = new Set(dias);
  const d = new Date(ref);
  for (let i = 0; i < 30; i++) {
    if (set.has(d.getDay())) return new Date(d);
    d.setDate(d.getDate() - 1);
  }
  return null;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function planejarConteudos(params: {
  itens: PlanoItem[];
  diasProducao: number[];
  diasEdicao: number[];
  diasPublicacao: number[];
  dataInicio: Date;
  dataFim: Date;
}) {
  const { itens, diasProducao, diasEdicao, diasPublicacao, dataInicio, dataFim } = params;
  const datasPub = datasNoPeriodo(dataInicio, dataFim, diasPublicacao);
  const rows: Array<{ tipo: string; titulo: string; dataPub: Date; dataEd: Date; dataProd: Date }> = [];
  for (const item of itens) {
    if (!item.quantidade || item.quantidade <= 0) continue;
    for (let i = 0; i < item.quantidade; i++) {
      const idx = Math.floor((i / item.quantidade) * datasPub.length);
      const dataPub = datasPub[Math.min(idx, datasPub.length - 1)] ?? datasPub[datasPub.length - 1] ?? dataInicio;
      if (!dataPub) continue;
      const dataEd = anteriorEm(new Date(dataPub.getTime() - 86400000), diasEdicao) ?? dataPub;
      const dataProd = anteriorEm(new Date(dataEd.getTime() - 86400000), diasProducao) ?? dataEd;
      rows.push({
        tipo: item.tipo,
        titulo: `${item.tipo} ${String(i + 1).padStart(2, "0")}`,
        dataPub,
        dataEd,
        dataProd,
      });
    }
  }
  return rows;
}

export async function gerarCronograma(params: {
  clientId: string;
  contractId: string;
  itens: PlanoItem[];
  equipe: EquipeOp;
  diasProducao: number[];
  diasEdicao: number[];
  diasPublicacao: number[];
  dataInicio: Date;
  dataFim: Date;
}) {
  const { clientId, contractId, equipe } = params;
  const plano = planejarConteudos(params);
  // Responsável de produção default: videomaker se existir, senão copywriter/designer.
  const assigneeDefault = equipe.videomaker || equipe.copywriter || equipe.designer || null;
  const rows = plano.map((p) => ({
    client_id: clientId,
    contract_id: contractId,
    categoria: p.tipo,
    tipo: "postagem",
    titulo: p.titulo,
    atividade: p.titulo,
    tema: p.titulo,
    data_publicacao: ymd(p.dataPub),
    data_post: ymd(p.dataPub),
    data_edicao: ymd(p.dataEd),
    data_gravacao: ymd(p.dataProd),
    etapa_atual: "producao",
    status_producao: "briefing",
    status_edicao: "pendente",
    status_postagem: "pendente",
    status: "agendado",
    fase: "roteiro",
    entregue: false,
    assignee_id: assigneeDefault,
    editor_id: equipe.editor || null,
    postador_id: equipe.social_media || null,
  }));
  if (!rows.length) return { count: 0, error: null as any };
  const { error } = await supabase.from("content_posts").insert(rows as any);
  return { count: rows.length, error };
}

export const WEEKDAYS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
] as const;

export function weekdayLabels(dias: number[]): string {
  return dias
    .slice()
    .sort()
    .map((d) => WEEKDAYS.find((w) => w.value === d)?.label ?? "")
    .filter(Boolean)
    .join(", ");
}
