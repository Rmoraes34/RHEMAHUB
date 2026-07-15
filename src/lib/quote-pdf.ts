import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatBRL } from "@/lib/format";

export interface QuoteItem {
  nome: string;
  categoria: string;
  descricao: string;
  valor: number;
  quantidade: number;
}

export interface QuotePdfData {
  titulo: string;
  versao: number;
  cliente_nome: string;
  cliente_empresa?: string | null;
  cliente_contato?: string | null;
  itens: QuoteItem[];
  subtotal: number;
  desconto: number;
  total: number;
  validade_dias: number;
  observacoes?: string | null;
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

export function generateQuotePdf(quote: QuotePdfData, company: CompanyInfo): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;

  // Header band
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, pageW, 92, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(company.nome || "Rhema Estratégia", margin, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Proposta Comercial", margin, 66);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ORÇAMENTO", pageW - margin, 42, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const dateStr = new Date(quote.created_at ?? Date.now()).toLocaleDateString("pt-BR");
  doc.text(`Versão ${quote.versao} • ${dateStr}`, pageW - margin, 60, { align: "right" });

  // Company logo (data URL), drawn at right of the header band
  if (company.logo_url && company.logo_url.startsWith("data:image")) {
    try {
      const fmt = company.logo_url.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(company.logo_url, fmt, pageW - margin - 64, 12, 64, 32, undefined, "FAST");
    } catch {
      /* ignora logo inválido */
    }
  }

  let y = 128;

  // Client block
  doc.setTextColor(...PURPLE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CLIENTE", margin, y);
  y += 18;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(quote.cliente_nome || "—", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  const clientLines: string[] = [];
  if (quote.cliente_empresa) clientLines.push(quote.cliente_empresa);
  if (quote.cliente_contato) clientLines.push(quote.cliente_contato);
  if (clientLines.length) {
    doc.text(clientLines.join("  •  "), margin, y);
    y += 16;
  }

  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  y += 8;
  doc.text(quote.titulo, margin, y);
  y += 12;

  // Items table
  autoTable(doc, {
    startY: y,
    head: [["Item", "Categoria", "Qtd", "Valor unit.", "Subtotal"]],
    body: quote.itens.map((it) => [
      `${it.nome}${it.descricao ? `\n${it.descricao}` : ""}`,
      it.categoria || "—",
      String(it.quantidade),
      formatBRL(it.valor),
      formatBRL(it.valor * it.quantidade),
    ]),
    theme: "grid",
    headStyles: { fillColor: PURPLE, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fontSize: 9, textColor: DARK, cellPadding: 6 },
    alternateRowStyles: { fillColor: PURPLE_LIGHT },
    columnStyles: {
      2: { halign: "center", cellWidth: 40 },
      3: { halign: "right", cellWidth: 80 },
      4: { halign: "right", cellWidth: 80 },
    },
    margin: { left: margin, right: margin },
  });

  // Totals
  // @ts-expect-error lastAutoTable is added by the plugin
  let ty = (doc.lastAutoTable?.finalY ?? y) + 20;
  const totalsX = pageW - margin - 200;
  const valX = pageW - margin;

  const totalRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 12 : 10);
    doc.setTextColor(...(bold ? PURPLE : GRAY));
    doc.text(label, totalsX, ty);
    doc.setTextColor(...(bold ? PURPLE : DARK));
    doc.text(value, valX, ty, { align: "right" });
    ty += bold ? 22 : 16;
  };

  totalRow("Subtotal", formatBRL(quote.subtotal));
  if (quote.desconto > 0) totalRow("Desconto", `- ${formatBRL(quote.desconto)}`);
  totalRow("TOTAL", formatBRL(quote.total), true);

  ty += 8;
  doc.setDrawColor(...PURPLE_LIGHT);
  doc.line(margin, ty, pageW - margin, ty);
  ty += 20;

  // Validity + observations
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Validade da proposta: ${quote.validade_dias} dias`, margin, ty);
  ty += 20;

  if (quote.observacoes?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PURPLE);
    doc.text("Observações / Condições comerciais", margin, ty);
    ty += 16;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.setFontSize(9);
    const obsLines = doc.splitTextToSize(quote.observacoes, pageW - margin * 2);
    doc.text(obsLines, margin, ty);
  }

  // Footer
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
