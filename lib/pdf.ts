import "server-only";
import PDFDocument from "pdfkit";
import type { TreinamentoSpec } from "./schema";

/**
 * Gera o "manual de bolso" em PDF: o resumo que o cliente acompanha durante
 * a apresentacao, com o essencial que ele nao pode deixar de entender —
 * dores, indicadores, script de ligacao completo e cronograma de follow-up.
 * O aprofundamento fica nos slides; aqui e so o que precisa ficar registrado.
 *
 * pdfkit desenha o PDF direto (sem navegador headless), leve e rapido —
 * mesmo racional do exportador de .pptx.
 */
const PRETO = "#0A0A0A";
const VERMELHO = "#E0263F";
const BRANCO = "#F5F5F5";
const CINZA = "#9AA0A6";

const CANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  call: "Call",
  email: "E-mail",
  instagram: "Instagram",
  sms: "SMS",
  presencial: "Presencial",
  outro: "Outro",
};

export async function exportTreinamentoPdf(spec: TreinamentoSpec): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 56, bottom: 56, left: 56, right: 56 } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const larguraUtil = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  function capa() {
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(PRETO);
    doc.rect(0, 0, 6, doc.page.height).fill(VERMELHO);
    doc
      .fillColor(VERMELHO)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("PULSO", 56, 90, { characterSpacing: 3 });
    doc
      .fillColor(BRANCO)
      .font("Helvetica-Bold")
      .fontSize(26)
      .text("Manual de bolso", 56, 130, { width: larguraUtil });
    doc
      .fillColor(CINZA)
      .font("Helvetica")
      .fontSize(12)
      .text(spec.meta.titulo || `Treinamento Comercial — ${spec.meta.cliente}`, 56, 175, { width: larguraUtil });
    const linhaCliente = [spec.meta.cliente, spec.meta.segmento, spec.meta.data].filter(Boolean).join("   ·   ");
    if (linhaCliente) {
      doc.fillColor(CINZA).fontSize(10).text(linhaCliente, 56, 200, { width: larguraUtil });
    }
    doc
      .fillColor(CINZA)
      .fontSize(9)
      .text(
        "Guia rápido para acompanhar a apresentação. O conteúdo aprofundado está nos slides — aqui está o essencial para não perder nada.",
        56,
        doc.page.height - 110,
        { width: larguraUtil },
      );
  }

  function novaPagina() {
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(PRETO);
  }

  function tituloSecao(texto: string) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 60) novaPagina();
    doc.moveDown(1.2);
    doc
      .fillColor(VERMELHO)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(texto.toUpperCase(), { characterSpacing: 1.5 });
    doc.moveDown(0.3);
    doc
      .strokeColor("#2A2A2A")
      .lineWidth(1)
      .moveTo(doc.x, doc.y)
      .lineTo(doc.x + larguraUtil, doc.y)
      .stroke();
    doc.moveDown(0.6);
  }

  function paragrafo(texto: string, opcoes: { cor?: string; negrito?: boolean; tamanho?: number } = {}) {
    if (!texto) return;
    doc
      .fillColor(opcoes.cor ?? BRANCO)
      .font(opcoes.negrito ? "Helvetica-Bold" : "Helvetica")
      .fontSize(opcoes.tamanho ?? 10.5)
      .text(texto, { width: larguraUtil, lineGap: 2 });
    doc.moveDown(0.5);
  }

  function rotuloValor(rotulo: string, valor: string) {
    if (!valor) return;
    doc.fillColor(VERMELHO).font("Helvetica-Bold").fontSize(9).text(rotulo.toUpperCase(), { characterSpacing: 1 });
    doc.moveDown(0.15);
    paragrafo(valor);
  }

  // ---------------------------------------------------------------- capa
  capa();
  novaPagina();

  // -------------------------------------------------- dores + indicadores
  if (spec.etapa1.dores.length) {
    tituloSecao("O que identificamos — dores do processo atual");
    for (const d of spec.etapa1.dores) {
      doc.fillColor(VERMELHO).text("•  ", { continued: true });
      doc.fillColor(BRANCO).font("Helvetica-Bold").fontSize(10.5).text(d.titulo, { continued: Boolean(d.detalhe) });
      if (d.detalhe) {
        doc.fillColor(CINZA).font("Helvetica").fontSize(10).text(`  — ${d.detalhe}`);
      } else {
        doc.text("");
      }
      doc.moveDown(0.35);
    }
  }

  if (spec.etapa2.indicadores.length) {
    tituloSecao("Indicadores que provam o resultado");
    for (const ind of spec.etapa2.indicadores) {
      const linha = [ind.label, ind.atual && `atual: ${ind.atual}`, ind.meta && `meta: ${ind.meta}`]
        .filter(Boolean)
        .join("  —  ");
      rotuloValor("", "");
      doc.fillColor(BRANCO).font("Helvetica-Bold").fontSize(11).text(linha);
      if (ind.variacao) doc.fillColor(CINZA).font("Helvetica").fontSize(9.5).text(ind.variacao);
      doc.moveDown(0.4);
    }
  }

  // --------------------------------------------------- script de ligação
  const script = spec.materialApoio.scriptLigacao;
  if (script.abertura || script.fechamento) {
    tituloSecao("Script de ligação — pronto para uso");
    rotuloValor("Abertura", script.abertura);
    rotuloValor("Qualificação", script.qualificacao);
    rotuloValor("Apresentação", script.apresentacao);
    rotuloValor("Fechamento", script.fechamento);

    if (script.objecoes.length) {
      doc.moveDown(0.2);
      doc.fillColor(VERMELHO).font("Helvetica-Bold").fontSize(9).text("CONTORNO DE OBJEÇÕES", { characterSpacing: 1 });
      doc.moveDown(0.25);
      for (const o of script.objecoes) {
        doc.fillColor(CINZA).font("Helvetica-Bold").fontSize(10).text(o.objecao);
        doc.fillColor(BRANCO).font("Helvetica").fontSize(10).text(o.resposta, { width: larguraUtil, lineGap: 2 });
        doc.moveDown(0.35);
      }
    }
  }

  // ------------------------------------------------- cronograma follow-up
  if (spec.materialApoio.cronogramaFollowup.length) {
    tituloSecao("Cronograma de follow-up");
    const colDia = 60;
    const colCanal = 90;
    const colObjetivo = larguraUtil - colDia - colCanal;
    const xInicio = doc.x;

    doc.fillColor(VERMELHO).font("Helvetica-Bold").fontSize(9);
    let y = doc.y;
    doc.text("DIA", xInicio, y, { width: colDia });
    doc.text("CANAL", xInicio + colDia, y, { width: colCanal });
    doc.text("OBJETIVO", xInicio + colDia + colCanal, y, { width: colObjetivo });
    doc.moveDown(0.5);
    doc
      .strokeColor("#2A2A2A")
      .moveTo(xInicio, doc.y)
      .lineTo(xInicio + larguraUtil, doc.y)
      .stroke();
    doc.moveDown(0.35);

    for (const c of spec.materialApoio.cronogramaFollowup) {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 50) {
        novaPagina();
        doc.y = doc.page.margins.top;
      }
      y = doc.y;
      doc.fillColor(BRANCO).font("Helvetica-Bold").fontSize(9.5).text(c.dia, xInicio, y, { width: colDia });
      doc
        .fillColor(CINZA)
        .font("Helvetica")
        .fontSize(9.5)
        .text(CANAL_LABEL[c.canal] ?? c.canal, xInicio + colDia, y, { width: colCanal });
      doc
        .fillColor(BRANCO)
        .font("Helvetica")
        .fontSize(9.5)
        .text(c.objetivo, xInicio + colDia + colCanal, y, { width: colObjetivo, lineGap: 1 });
      doc.moveDown(0.55);
    }
  }

  doc.end();
  return done;
}
