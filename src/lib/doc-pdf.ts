import jsPDF from "jspdf";
import { formatBRL } from "@/lib/format";

// Gerador de documento simples (Orçamento ou Contrato) na identidade Rhema (roxo/branco).
export interface SimpleDocData {
  tipo: "ORÇAMENTO" | "CONTRATO";
  cliente_nome: string;
  servico: string;
  valor: number;
  descricao?: string | null;
  // Campos extras usados apenas no contrato:
  vigencia?: string | null;
  recorrencia?: string | null;
  forma_pagamento?: string | null;
  created_at?: string;
}

export interface CompanyInfo {
  nome: string;
  cnpj?: string | null;
  info_fiscal?: string | null;
  logo_url?: string | null;
}

const PURPLE: [number, number, number] = [109, 40, 217];
const PURPLE_LIGHT: [number, number, number] = [237, 233, 254];
const DARK: [number, number, number] = [30, 27, 45];
const GRAY: [number, number, number] = [110, 110, 125];

export function generateSimpleDoc(data: SimpleDocData, company: CompanyInfo): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;

  // Faixa de cabeçalho
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, pageW, 92, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(company.nome || "Rhema Estratégia", margin, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Marketing Digital", margin, 66);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(data.tipo, pageW - margin, 42, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const dateStr = new Date(data.created_at ?? Date.now()).toLocaleDateString("pt-BR");
  doc.text(dateStr, pageW - margin, 60, { align: "right" });

  if (company.logo_url && company.logo_url.startsWith("data:image")) {
    try {
      const fmt = company.logo_url.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(company.logo_url, fmt, pageW - margin - 64, 12, 64, 32, undefined, "FAST");
    } catch {
      /* ignora logo inválido */
    }
  }

  let y = 132;

  const block = (label: string, value: string, big = false) => {
    doc.setTextColor(...PURPLE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label.toUpperCase(), margin, y);
    y += big ? 20 : 16;
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", big ? "bold" : "normal");
    doc.setFontSize(big ? 15 : 12);
    const lines = doc.splitTextToSize(value || "—", pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * (big ? 18 : 15) + 16;
  };

  block("Cliente", data.cliente_nome || "—", true);
  block("Serviço contratado", data.servico || "—");

  // Valor destacado
  doc.setFillColor(...PURPLE_LIGHT);
  doc.roundedRect(margin, y - 4, 220, 46, 6, 6, "F");
  doc.setTextColor(...PURPLE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VALOR DA PROPOSTA", margin + 14, y + 14);
  doc.setFontSize(20);
  doc.text(formatBRL(data.valor), margin + 14, y + 34);
  y += 66;

  if (data.tipo === "CONTRATO") {
    const extras = [
      data.vigencia ? `Vigência: ${data.vigencia}` : "",
      data.recorrencia ? `Recorrência: ${data.recorrencia}` : "",
      data.forma_pagamento ? `Pagamento: ${data.forma_pagamento}` : "",
    ].filter(Boolean);
    if (extras.length) {
      doc.setTextColor(...GRAY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(extras.join("   •   "), margin, y);
      y += 24;
    }
  }

  if (data.descricao?.trim()) {
    block("Descrição", data.descricao);
  }

  // Rodapé
  const footerY = pageH - 48;
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(1);
  doc.line(margin, footerY - 14, pageW - margin, footerY - 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PURPLE);
  doc.text(company.nome || "Rhema Estratégia", margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.setFontSize(8);
  const footerParts = [company.cnpj ? `CNPJ: ${company.cnpj}` : "", company.info_fiscal ?? ""].filter(Boolean);
  if (footerParts.length) doc.text(footerParts.join("  •  "), margin, footerY + 12);

  return doc;
}
