import "server-only";
import type { TreinamentoSpec } from "./schema";

/**
 * Serializa o treinamento (ja gerado, com as edicoes do consultor se houver)
 * de volta em texto simples, no formato pensado para ser colado direto no
 * Project do Claude do cliente — assim o Project passa a "lembrar" o que ja
 * foi apresentado, e um proximo treinamento pode construir em cima disso em
 * vez de repetir o mesmo diagnostico.
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

function secao(titulo: string, linhas: (string | null | undefined | false)[]): string {
  const corpo = linhas.filter((l): l is string => Boolean(l)).join("\n");
  return corpo ? `## ${titulo}\n${corpo}\n` : "";
}

export function gerarResumoParaProjeto(spec: TreinamentoSpec): string {
  const titulo = spec.meta.titulo || `Treinamento Comercial — ${spec.meta.cliente}`;
  const indicadoresValidos = spec.etapa2.indicadores.filter((i) => i.atual);
  const script = spec.materialApoio.scriptLigacao;

  const partes: string[] = [
    `# Treinamento apresentado — ${titulo}\n${[spec.meta.cliente, spec.meta.segmento, spec.meta.data].filter(Boolean).join("  ·  ")}\n`,

    secao("Processo atual", [
      `Canais: ${spec.etapa1.processoAtual.canais.map((c) => CANAL_LABEL[c] ?? c).join(", ")}`,
      spec.etapa1.processoAtual.descricao,
    ]),

    spec.etapa1.dores.length
      ? secao(
          "Dores identificadas",
          spec.etapa1.dores.map((d, i) => `${i + 1}. ${d.titulo}${d.detalhe ? ` — ${d.detalhe}` : ""}`),
        )
      : "",

    spec.etapa2.estrategiasExecutadas.length
      ? secao(
          "Estratégias executadas",
          spec.etapa2.estrategiasExecutadas.map(
            (e, i) => `${i + 1}. ${e.nome} — ${e.descricao}${e.resultado ? ` (resultado: ${e.resultado})` : ""}`,
          ),
        )
      : "",

    indicadoresValidos.length
      ? secao(
          "Indicadores",
          indicadoresValidos.map(
            (ind) => `${ind.label}: ${ind.atual}${ind.meta ? ` (meta: ${ind.meta})` : ""}${ind.variacao ? ` — ${ind.variacao}` : ""}`,
          ),
        )
      : "",

    ...spec.etapa3.roleplayWhatsapp.map((c, i) =>
      secao(`Roleplay WhatsApp ${i + 1} — ${c.titulo}`, [
        c.contexto,
        "",
        ...c.mensagens.map((m) => `[${m.autor === "consultor" ? "Consultor" : "Cliente"}] ${m.texto}`),
      ]),
    ),

    ...spec.etapa3.roleplayLigacao.map((c, i) =>
      secao(`Simulação de ligação ${i + 1} — ${c.titulo}`, [
        c.contexto,
        "",
        ...c.roteiro.flatMap((r) => [
          `${r.etapa}: ${r.falaSugerida}`,
          r.objecaoComum ? `  Objeção: ${r.objecaoComum} → ${r.respostaObjecao}` : null,
        ]),
      ]),
    ),

    secao("Script de ligação", [
      script.abertura ? `Abertura: ${script.abertura}` : null,
      script.qualificacao ? `Qualificação: ${script.qualificacao}` : null,
      script.apresentacao ? `Apresentação: ${script.apresentacao}` : null,
      ...script.objecoes.map((o) => `Objeção: ${o.objecao} → ${o.resposta}`),
      script.fechamento ? `Fechamento: ${script.fechamento}` : null,
    ]),

    spec.materialApoio.cronogramaFollowup.length
      ? secao(
          "Cronograma de follow-up",
          spec.materialApoio.cronogramaFollowup.map(
            (c) => `${c.dia} · ${CANAL_LABEL[c.canal] ?? c.canal} · ${c.objetivo}${c.mensagemExemplo ? ` — "${c.mensagemExemplo}"` : ""}`,
          ),
        )
      : "",

    "---\nEste resumo foi exportado do gerador de treinamentos da Pulso. Adicione-o ao\nProject deste cliente no Claude para manter o histórico do que já foi\napresentado — treinamentos futuros podem construir em cima disso.",
  ];

  return partes.filter(Boolean).join("\n");
}
