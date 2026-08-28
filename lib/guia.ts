import "server-only";
import type { TreinamentoSpec } from "./schema";

/**
 * Guia do consultor: roteiro em .txt com o que falar em cada slide, na mesma
 * ordem em que os slides aparecem em TreinamentoRenderer.tsx. Os slides
 * agora sao curtos e diretos de proposito (manchete/bullet point) — este
 * guia e onde fica o detalhe completo (o "detalhe"/"resultado" que nao coube
 * na tela), para o consultor nao esquecer nada na hora de apresentar.
 *
 * Gerado direto do TreinamentoSpec ja validado, sem chamada de IA extra:
 * mais rapido, sem custo e sempre consistente com o que esta nos slides.
 */
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

function bloco(titulo: string, linhas: (string | false | null | undefined)[]): string {
  const corpo = linhas.filter((l): l is string => Boolean(l)).join("\n");
  return `${"—".repeat(60)}\n${titulo}\n${"—".repeat(60)}\n${corpo}\n`;
}

export function gerarGuiaConsultor(spec: TreinamentoSpec): string {
  const titulo = spec.meta.titulo || `Treinamento Comercial — ${spec.meta.cliente}`;
  const partes: string[] = [];
  let n = 0;
  const slide = () => {
    n += 1;
    return n;
  };

  partes.push(
    `GUIA DO CONSULTOR — ${titulo}\n` +
      `${[spec.meta.cliente, spec.meta.segmento, spec.meta.data].filter(Boolean).join("  ·  ")}\n\n` +
      `Roteiro de apoio para conduzir a apresentação, slide a slide. Os slides na\n` +
      `tela são curtos de propósito — aqui está o detalhe completo de cada ponto,\n` +
      `para você não esquecer nenhuma informação durante o treinamento.\n`,
  );

  partes.push(
    bloco(`SLIDE ${slide()} — ABERTURA`, [
      `Apresente o treinamento: "${titulo}".`,
      [spec.meta.cliente, spec.meta.segmento].filter(Boolean).length
        ? `Contextualize: ${[spec.meta.cliente, spec.meta.segmento].filter(Boolean).join("  ·  ")}.`
        : null,
    ]),
  );

  partes.push(
    bloco(`SLIDE ${slide()} — PROCESSO ATUAL  (Etapa 1 · Conexão)`, [
      `Canais usados hoje: ${spec.etapa1.processoAtual.canais.map((c) => CANAL_LABEL[c] ?? c).join(", ")}.`,
      spec.etapa1.processoAtual.descricao,
    ]),
  );

  if (spec.etapa1.dores.length) {
    partes.push(
      bloco(`SLIDE ${slide()} — PRINCIPAIS DORES  (Etapa 1 · Conexão)`, [
        "Objetivo do slide: o time se reconhecer no diagnóstico antes de ouvir a solução.",
        "",
        ...spec.etapa1.dores.flatMap((d, i) => [`${i + 1}. ${d.titulo}`, d.detalhe ? `   ${d.detalhe}` : null]),
      ]),
    );
  }

  if (spec.etapa2.estrategiasExecutadas.length) {
    partes.push(
      bloco(
        `SLIDE ${slide()} — ESTRATÉGIAS EXECUTADAS  (Etapa 2 · Direcionamento tático)`,
        spec.etapa2.estrategiasExecutadas.flatMap((e, i) => [
          `${i + 1}. ${e.nome}`,
          e.descricao ? `   O que foi feito: ${e.descricao}` : null,
          e.resultado ? `   Resultado: ${e.resultado}` : null,
        ]),
      ),
    );
  }

  if (spec.etapa2.indicadores.length) {
    partes.push(
      bloco(
        `SLIDE ${slide()} — INDICADORES  (Etapa 2 · Direcionamento tático)`,
        spec.etapa2.indicadores.flatMap((ind) => [
          `${ind.label}: atual ${ind.atual}${ind.meta ? `, meta ${ind.meta}` : ""}`,
          ind.variacao ? `   ${ind.variacao}` : null,
        ]),
      ),
    );
  }

  partes.push(
    bloco(`SLIDE ${slide()} — INTRODUÇÃO AO ROLEPLAY  (Etapa 3 · Treinamento tático)`, [
      "Explique: agora é a parte prática — simulações de WhatsApp e de ligação.",
      "Lembrete de navegação: setas ← → avançam/voltam as mensagens com calma; setas ↑ ↓ trocam de slide.",
    ]),
  );

  spec.etapa3.roleplayWhatsapp.forEach((c, i) => {
    partes.push(
      bloco(`SLIDE ${slide()} — ROLEPLAY WHATSAPP ${i + 1}: ${c.titulo}`, [
        c.contexto ? `Contexto: ${c.contexto}` : null,
        "",
        "Conversa completa (avance mensagem por mensagem no slide, sem pressa):",
        ...c.mensagens.map((m, j) => `  ${j + 1}. [${m.autor === "consultor" ? "Consultor" : "Cliente"}] ${m.texto}`),
      ]),
    );
  });

  spec.etapa3.roleplayLigacao.forEach((c, i) => {
    partes.push(
      bloco(`SLIDE ${slide()} — SIMULAÇÃO DE LIGAÇÃO ${i + 1}: ${c.titulo}`, [
        c.contexto ? `Contexto: ${c.contexto}` : null,
        "",
        ...c.roteiro.flatMap((r) => [
          `${r.etapa.toUpperCase()}:`,
          `  ${r.falaSugerida}`,
          r.objecaoComum ? `  Objeção comum: ${r.objecaoComum}` : null,
          r.respostaObjecao ? `  Como responder: ${r.respostaObjecao}` : null,
          "",
        ]),
      ]),
    );
  });

  const script = spec.materialApoio.scriptLigacao;
  partes.push(
    bloco(`SLIDE ${slide()} — MATERIAL DE APOIO`, [
      "Diga ao cliente: o manual de bolso em PDF e a apresentação em .pptx editável",
      "estão disponíveis para download ao final desta página.",
      "",
      "Script de ligação — resumo para você conduzir a conversa final com o time:",
      script.abertura ? `  Abertura: ${script.abertura}` : null,
      script.qualificacao ? `  Qualificação: ${script.qualificacao}` : null,
      script.apresentacao ? `  Apresentação: ${script.apresentacao}` : null,
      ...script.objecoes.flatMap((o) => [`  Objeção: ${o.objecao}`, `    Resposta: ${o.resposta}`]),
      script.fechamento ? `  Fechamento: ${script.fechamento}` : null,
      spec.materialApoio.cronogramaFollowup.length
        ? `\nCronograma de follow-up: ${spec.materialApoio.cronogramaFollowup.length} etapa(s) — reforce que o time vai sair daqui com isso pronto para aplicar.`
        : null,
    ]),
  );

  return partes.join("\n");
}
