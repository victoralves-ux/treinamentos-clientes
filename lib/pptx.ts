import "server-only";
import PptxGenJS from "pptxgenjs";
import type { TreinamentoSpec } from "./schema";

/**
 * Exporta o TreinamentoSpec para .pptx — editavel no PowerPoint/Keynote/Google
 * Slides na hora, sem depender de navegador headless (pptxgenjs e puro JS,
 * entao o arquivo sai leve e a geracao roda na funcao serverless sem custo
 * extra de infraestrutura).
 *
 * Identidade visual fixa da Pulso: preto e vermelho, tom serio e premium.
 */
const PRETO = "0A0A0A";
const PRETO_PAINEL = "151515";
const VERMELHO = "E0263F";
const BRANCO = "F5F5F5";
const CINZA = "9AA0A6";

const FONTE_TITULO = "Georgia";
const FONTE_CORPO = "Calibri";

function capa(pptx: PptxGenJS, spec: TreinamentoSpec) {
  const slide = pptx.addSlide();
  slide.background = { color: PRETO };
  slide.addShape("rect", { x: 0, y: 6.7, w: "100%", h: 0.06, fill: { color: VERMELHO } });
  slide.addText("PULSO", { x: 0.6, y: 0.5, fontSize: 14, color: VERMELHO, bold: true, charSpacing: 3, fontFace: FONTE_CORPO });
  slide.addText(spec.meta.titulo || `Treinamento Comercial — ${spec.meta.cliente}`, {
    x: 0.6,
    y: 2.6,
    w: 9,
    fontSize: 34,
    color: BRANCO,
    bold: true,
    fontFace: FONTE_TITULO,
  });
  const sub = [spec.meta.cliente, spec.meta.segmento, spec.meta.data].filter(Boolean).join("  ·  ");
  if (sub) slide.addText(sub, { x: 0.6, y: 3.5, w: 9, fontSize: 15, color: CINZA, fontFace: FONTE_CORPO });
}

function tituloEtapa(slide: PptxGenJS.Slide, numero: string, titulo: string) {
  slide.background = { color: PRETO };
  slide.addShape("rect", { x: 0, y: 0, w: 0.14, h: "100%", fill: { color: VERMELHO } });
  slide.addText(numero, { x: 0.55, y: 0.4, fontSize: 12, color: VERMELHO, bold: true, charSpacing: 2, fontFace: FONTE_CORPO });
  slide.addText(titulo, { x: 0.55, y: 0.65, w: 9, fontSize: 24, color: BRANCO, bold: true, fontFace: FONTE_TITULO });
}

function etapa1(pptx: PptxGenJS, spec: TreinamentoSpec) {
  const s1 = pptx.addSlide();
  tituloEtapa(s1, "ETAPA 1 · CONEXÃO", "Processo atual");
  const canais = spec.etapa1.processoAtual.canais.map((c) => c.toUpperCase()).join("   ·   ");
  s1.addText(canais, { x: 0.6, y: 1.6, w: 9, fontSize: 14, color: VERMELHO, bold: true, fontFace: FONTE_CORPO });
  s1.addText(spec.etapa1.processoAtual.descricao, {
    x: 0.6,
    y: 2.1,
    w: 8.8,
    h: 3.5,
    fontSize: 16,
    color: BRANCO,
    fontFace: FONTE_CORPO,
    valign: "top",
    lineSpacingMultiple: 1.3,
  });

  if (spec.etapa1.dores.length) {
    const s2 = pptx.addSlide();
    tituloEtapa(s2, "ETAPA 1 · CONEXÃO", "Principais dores");
    let y = 1.7;
    for (const dor of spec.etapa1.dores) {
      s2.addShape("rect", { x: 0.6, y: y + 0.05, w: 0.08, h: 0.4, fill: { color: VERMELHO } });
      s2.addText(dor.titulo, { x: 0.85, y, w: 8.5, fontSize: 15, color: BRANCO, bold: true, fontFace: FONTE_CORPO });
      if (dor.detalhe) {
        s2.addText(dor.detalhe, { x: 0.85, y: y + 0.35, w: 8.5, fontSize: 12, color: CINZA, fontFace: FONTE_CORPO });
      }
      y += dor.detalhe ? 1.1 : 0.7;
    }
  }
}

function etapa2(pptx: PptxGenJS, spec: TreinamentoSpec) {
  if (spec.etapa2.estrategiasExecutadas.length) {
    const s = pptx.addSlide();
    tituloEtapa(s, "ETAPA 2 · DIRECIONAMENTO TÁTICO", "Estratégias executadas");
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: "Estratégia", options: { bold: true, color: VERMELHO, fill: { color: PRETO_PAINEL } } },
        { text: "Descrição", options: { bold: true, color: VERMELHO, fill: { color: PRETO_PAINEL } } },
        { text: "Resultado", options: { bold: true, color: VERMELHO, fill: { color: PRETO_PAINEL } } },
      ],
      ...spec.etapa2.estrategiasExecutadas.map(
        (e): PptxGenJS.TableRow => [
          { text: e.nome, options: { color: BRANCO, bold: true } },
          { text: e.descricao, options: { color: CINZA } },
          { text: e.resultado, options: { color: BRANCO } },
        ],
      ),
    ];
    s.addTable(rows, {
      x: 0.6,
      y: 1.6,
      w: 8.8,
      fontSize: 11,
      fontFace: FONTE_CORPO,
      border: { type: "solid", color: "2A2A2A", pt: 0.5 },
      autoPage: false,
    });
  }

  if (spec.etapa2.indicadores.length) {
    const s = pptx.addSlide();
    tituloEtapa(s, "ETAPA 2 · DIRECIONAMENTO TÁTICO", "Indicadores");
    const n = spec.etapa2.indicadores.length;
    const largura = Math.min(2.7, 8.8 / n - 0.2);
    spec.etapa2.indicadores.forEach((ind, i) => {
      const x = 0.6 + i * (largura + 0.25);
      s.addShape("roundRect", {
        x,
        y: 1.8,
        w: largura,
        h: 2.6,
        fill: { color: PRETO_PAINEL },
        line: { color: "2A2A2A", width: 1 },
        rectRadius: 0.08,
      });
      s.addText(ind.label.toUpperCase(), { x: x + 0.15, y: 2.0, w: largura - 0.3, fontSize: 10, color: CINZA, bold: true, fontFace: FONTE_CORPO });
      s.addText(ind.atual, { x: x + 0.15, y: 2.35, w: largura - 0.3, fontSize: 24, color: VERMELHO, bold: true, fontFace: FONTE_TITULO });
      if (ind.meta) s.addText(`Meta: ${ind.meta}`, { x: x + 0.15, y: 3.15, w: largura - 0.3, fontSize: 10, color: BRANCO, fontFace: FONTE_CORPO });
      if (ind.variacao) s.addText(ind.variacao, { x: x + 0.15, y: 3.45, w: largura - 0.3, fontSize: 10, color: CINZA, fontFace: FONTE_CORPO });
    });
  }
}

function bolhaWhatsapp(slide: PptxGenJS.Slide, texto: string, autor: "consultor" | "cliente", y: number) {
  const consultor = autor === "consultor";
  const w = 5.2;
  const x = consultor ? 0.6 : 9.0 - 0.6 - w;
  slide.addText(texto, {
    x,
    y,
    w,
    fontSize: 11,
    color: consultor ? BRANCO : PRETO,
    fill: { color: consultor ? "1E1E1E" : "D9D9D9" },
    fontFace: FONTE_CORPO,
    align: "left",
    valign: "top",
    margin: [8, 10, 8, 10],
    shape: "roundRect" as unknown as PptxGenJS.ShapeType,
    rectRadius: 0.08,
    autoFit: true,
  });
}

function etapa3(pptx: PptxGenJS, spec: TreinamentoSpec) {
  for (const cenario of spec.etapa3.roleplayWhatsapp) {
    const s = pptx.addSlide();
    tituloEtapa(s, "ETAPA 3 · TREINAMENTO TÁTICO", `Roleplay WhatsApp — ${cenario.titulo}`);
    if (cenario.contexto) {
      s.addText(cenario.contexto, { x: 0.6, y: 1.35, w: 8.8, fontSize: 11, color: CINZA, italic: true, fontFace: FONTE_CORPO });
    }
    let y = 1.75;
    for (const m of cenario.mensagens.slice(0, 9)) {
      bolhaWhatsapp(s, m.texto, m.autor, y);
      y += 0.62;
    }
  }

  for (const cenario of spec.etapa3.roleplayLigacao) {
    const s = pptx.addSlide();
    tituloEtapa(s, "ETAPA 3 · TREINAMENTO TÁTICO", `Simulação de ligação — ${cenario.titulo}`);
    if (cenario.contexto) {
      s.addText(cenario.contexto, { x: 0.6, y: 1.35, w: 8.8, fontSize: 11, color: CINZA, italic: true, fontFace: FONTE_CORPO });
    }
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: "Etapa", options: { bold: true, color: VERMELHO, fill: { color: PRETO_PAINEL } } },
        { text: "Fala sugerida", options: { bold: true, color: VERMELHO, fill: { color: PRETO_PAINEL } } },
      ],
      ...cenario.roteiro.map(
        (r): PptxGenJS.TableRow => [
          { text: r.etapa, options: { color: BRANCO, bold: true } },
          {
            text: [r.falaSugerida, r.objecaoComum ? `Objeção: ${r.objecaoComum} → ${r.respostaObjecao}` : ""]
              .filter(Boolean)
              .join("\n\n"),
            options: { color: CINZA },
          },
        ],
      ),
    ];
    s.addTable(rows, {
      x: 0.6,
      y: 1.75,
      w: 8.8,
      fontSize: 10,
      fontFace: FONTE_CORPO,
      border: { type: "solid", color: "2A2A2A", pt: 0.5 },
      autoPage: false,
    });
  }
}

function materialApoio(pptx: PptxGenJS, spec: TreinamentoSpec) {
  const script = spec.materialApoio.scriptLigacao;
  const s1 = pptx.addSlide();
  tituloEtapa(s1, "MATERIAL DE APOIO", "Script de ligação");
  const blocos = [
    ["Abertura", script.abertura],
    ["Qualificação", script.qualificacao],
    ["Apresentação", script.apresentacao],
    ["Fechamento", script.fechamento],
  ].filter(([, v]) => v);
  let y = 1.6;
  for (const [label, texto] of blocos) {
    s1.addText(label!.toUpperCase(), { x: 0.6, y, fontSize: 10, color: VERMELHO, bold: true, fontFace: FONTE_CORPO });
    s1.addText(texto!, { x: 0.6, y: y + 0.28, w: 8.8, fontSize: 12, color: BRANCO, fontFace: FONTE_CORPO, lineSpacingMultiple: 1.2 });
    y += 1.15;
  }

  if (script.objecoes.length) {
    const s2 = pptx.addSlide();
    tituloEtapa(s2, "MATERIAL DE APOIO", "Contorno de objeções");
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: "Objeção", options: { bold: true, color: VERMELHO, fill: { color: PRETO_PAINEL } } },
        { text: "Resposta", options: { bold: true, color: VERMELHO, fill: { color: PRETO_PAINEL } } },
      ],
      ...script.objecoes.map(
        (o): PptxGenJS.TableRow => [
          { text: o.objecao, options: { color: BRANCO, bold: true } },
          { text: o.resposta, options: { color: CINZA } },
        ],
      ),
    ];
    s2.addTable(rows, { x: 0.6, y: 1.6, w: 8.8, fontSize: 11, fontFace: FONTE_CORPO, border: { type: "solid", color: "2A2A2A", pt: 0.5 }, autoPage: false });
  }

  if (spec.materialApoio.cronogramaFollowup.length) {
    const s3 = pptx.addSlide();
    tituloEtapa(s3, "MATERIAL DE APOIO", "Cronograma de follow-up");
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: "Dia", options: { bold: true, color: VERMELHO, fill: { color: PRETO_PAINEL } } },
        { text: "Canal", options: { bold: true, color: VERMELHO, fill: { color: PRETO_PAINEL } } },
        { text: "Objetivo", options: { bold: true, color: VERMELHO, fill: { color: PRETO_PAINEL } } },
        { text: "Mensagem de exemplo", options: { bold: true, color: VERMELHO, fill: { color: PRETO_PAINEL } } },
      ],
      ...spec.materialApoio.cronogramaFollowup.map(
        (c): PptxGenJS.TableRow => [
          { text: c.dia, options: { color: BRANCO, bold: true } },
          { text: c.canal, options: { color: BRANCO } },
          { text: c.objetivo, options: { color: CINZA } },
          { text: c.mensagemExemplo, options: { color: CINZA } },
        ],
      ),
    ];
    s3.addTable(rows, {
      x: 0.4,
      y: 1.6,
      w: 9.2,
      fontSize: 9.5,
      fontFace: FONTE_CORPO,
      border: { type: "solid", color: "2A2A2A", pt: 0.5 },
      autoPage: false,
      colW: [0.9, 1.3, 2.7, 4.3],
    });
  }
}

export async function exportTreinamentoPptx(spec: TreinamentoSpec): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "PULSO_16x9", width: 10, height: 5.63 });
  pptx.layout = "PULSO_16x9";
  pptx.author = "Pulso";
  pptx.title = spec.meta.titulo;

  capa(pptx, spec);
  etapa1(pptx, spec);
  etapa2(pptx, spec);
  etapa3(pptx, spec);
  materialApoio(pptx, spec);

  const data = await pptx.write({ outputType: "nodebuffer" });
  return data as Buffer;
}
