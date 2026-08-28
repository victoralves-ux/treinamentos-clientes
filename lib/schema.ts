import { z } from "zod";

/**
 * TreinamentoSpec e o contrato entre a IA e a camada de renderizacao.
 * A IA nunca escreve HTML: preenche esta estrutura tipada, e os componentes
 * React (e os exportadores de PDF/txt) transformam isso em apresentacao.
 *
 * As 3 etapas seguem o roteiro fixo do treinamento comercial da Pulso:
 * 1) conexao — processo atual do cliente e as dores dele
 * 2) direcionamento tatico — o que ja foi executado e os indicadores
 * 3) treinamento tatico — roleplay interativo (WhatsApp e ligacao)
 * A identidade visual (preto/vermelho) e sempre fixa: nao ha tema por cliente.
 */

const texto = z.string().default("");
const lista = z.array(z.string()).default([]);

/* ------------------------------- etapa 1 ---------------------------------- */

// .catch("outro"): um canal fora da lista nunca pode derrubar a geracao
// inteira — cai em "outro" em vez de falhar a validacao do treinamento.
export const canalSchema = z
  .enum(["whatsapp", "ligacao", "call", "email", "instagram", "sms", "presencial", "outro"])
  .catch("outro");

export const etapaConexaoSchema = z.object({
  processoAtual: z.object({
    canais: z.array(canalSchema).default(["whatsapp", "ligacao", "call"]),
    descricao: texto,
  }),
  dores: z
    .array(
      z.object({
        titulo: texto,
        detalhe: texto,
      }),
    )
    .default([]),
});
export type EtapaConexao = z.infer<typeof etapaConexaoSchema>;

/* ------------------------------- etapa 2 ---------------------------------- */

export const indicadorSchema = z.object({
  label: texto,
  atual: texto,
  meta: texto.optional().default(""),
  variacao: texto.optional().default(""),
});

export const etapaDirecionamentoSchema = z.object({
  estrategiasExecutadas: z
    .array(
      z.object({
        nome: texto,
        descricao: texto,
        resultado: texto,
      }),
    )
    .default([]),
  indicadores: z.array(indicadorSchema).default([]),
});
export type EtapaDirecionamento = z.infer<typeof etapaDirecionamentoSchema>;

/* ------------------------------- etapa 3 ---------------------------------- */

export const mensagemWhatsappSchema = z.object({
  // .catch: se a IA escrever um papel fora dos dois esperados, cai em
  // "consultor" em vez de derrubar a geracao inteira.
  autor: z.enum(["consultor", "cliente"]).catch("consultor"),
  texto: texto,
  hora: texto.optional().default(""),
});

export const cenarioWhatsappSchema = z.object({
  titulo: texto,
  contexto: texto,
  mensagens: z.array(mensagemWhatsappSchema).min(1),
});
export type CenarioWhatsapp = z.infer<typeof cenarioWhatsappSchema>;

export const etapaLigacaoSchema = z.object({
  etapa: texto,
  falaSugerida: texto,
  objecaoComum: texto.optional().default(""),
  respostaObjecao: texto.optional().default(""),
});

export const cenarioLigacaoSchema = z.object({
  titulo: texto,
  contexto: texto,
  roteiro: z.array(etapaLigacaoSchema).min(1),
});
export type CenarioLigacao = z.infer<typeof cenarioLigacaoSchema>;

export const etapaTreinamentoSchema = z.object({
  roleplayWhatsapp: z.array(cenarioWhatsappSchema).default([]),
  roleplayLigacao: z.array(cenarioLigacaoSchema).default([]),
});
export type EtapaTreinamento = z.infer<typeof etapaTreinamentoSchema>;

/* --------------------------- material de apoio ----------------------------- */

export const scriptLigacaoSchema = z.object({
  abertura: texto,
  qualificacao: texto,
  apresentacao: texto,
  objecoes: z.array(z.object({ objecao: texto, resposta: texto })).default([]),
  fechamento: texto,
});
export type ScriptLigacao = z.infer<typeof scriptLigacaoSchema>;

export const cronogramaItemSchema = z.object({
  dia: texto,
  canal: canalSchema,
  objetivo: texto,
  mensagemExemplo: texto,
});
export type CronogramaItem = z.infer<typeof cronogramaItemSchema>;

/* --------------------------------- spec ------------------------------------ */

export const treinamentoSpecSchema = z.object({
  meta: z.object({
    titulo: texto,
    cliente: texto,
    segmento: texto.optional().default(""),
    data: texto.optional().default(""),
  }),
  etapa1: etapaConexaoSchema,
  etapa2: etapaDirecionamentoSchema,
  etapa3: etapaTreinamentoSchema,
  materialApoio: z.object({
    scriptLigacao: scriptLigacaoSchema,
    cronogramaFollowup: z.array(cronogramaItemSchema).default([]),
  }),
});
export type TreinamentoSpec = z.infer<typeof treinamentoSpecSchema>;

/** Estrutura devolvida pela primeira chamada de IA (planejamento). */
export const planSchema = z.object({
  analysis: z.object({
    principaisDores: lista,
    principaisMetricas: lista,
    focoDoTreinamento: texto,
  }),
  outline: z
    .object({
      dores: z.number().int().min(1).max(8).catch(3),
      estrategias: z.number().int().min(0).max(8).catch(2),
      cenariosWhatsapp: z.number().int().min(1).max(4).catch(2),
      cenariosLigacao: z.number().int().min(1).max(4).catch(1),
    })
    .catch({ dores: 3, estrategias: 2, cenariosWhatsapp: 2, cenariosLigacao: 1 }),
  meta: z.object({
    titulo: texto,
    cliente: texto,
    segmento: texto.optional().default(""),
  }),
});
export type Plan = z.infer<typeof planSchema>;

/* ------------------------------ formulario ---------------------------------- */

export const businessSchema = z.object({
  cliente: z.string(),
  segmento: texto.optional().default(""),
  consultorResponsavel: texto.optional().default(""),
  dataTreinamento: texto.optional().default(""),
  processoAtual: texto.optional().default(""),
  dores: texto.optional().default(""),
  estrategiasExecutadas: texto.optional().default(""),
  metricas: texto.optional().default(""),
  exemplosConversas: texto.optional().default(""),
  scriptAtual: texto.optional().default(""),
  cronogramaAtual: texto.optional().default(""),
  observacoes: texto.optional().default(""),
  /** Briefing estruturado extraido do material bruto, quando houver. */
  context: z.any().optional().nullable(),
});
export type Business = z.infer<typeof businessSchema>;
