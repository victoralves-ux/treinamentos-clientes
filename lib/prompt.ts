import { contextBriefing, contextExemplos, contextSchema } from "./context";
import type { Business, Plan } from "./schema";

/**
 * Diretrizes de marca e tom, fixas — nao ha tema por cliente aqui.
 * Toda apresentacao usa a identidade Pulso: preto e vermelho, tom serio,
 * sobrio e premium (publico high ticket).
 */
const BRAND_BRIEF = `
IDENTIDADE E TOM (fixos, nao mude):
- Apresentacao comercial da Pulso para o time do cliente. Publico high ticket.
- Tom serio, sobrio, premium. Nada de emoji, nada de girias, nada de exclamacao em excesso.
- Frases curtas e diretas. Zero jargao de marketing vazio ("solucoes inovadoras").
- Nunca inventar numero, resultado ou frase de cliente que nao veio do briefing.
  Se um dado nao foi informado, o campo correspondente fica vazio — nao complete
  com exemplo generico.
`;

const ETAPAS_BRIEF = `
AS 3 ETAPAS DO TREINAMENTO (estrutura fixa, sempre nesta ordem):

ETAPA 1 — CONEXAO:
Mostra o processo atual do cliente (canais que ele usa: whatsapp, ligacao, call)
e as dores reais desse processo. Objetivo: o time do cliente se reconhecer no
diagnostico antes de ouvir a solucao.

ETAPA 2 — DIRECIONAMENTO TATICO:
Mostra o que ja foi executado (estrategias) e os indicadores que provam o efeito
disso — tempo de tela com as pessoas e taxa de conversao sao os dois indicadores
centrais, mas inclua qualquer outro indicador presente no briefing.

ETAPA 3 — TREINAMENTO TATICO:
Roleplay interativo. Cenarios de simulacao de conversa no WhatsApp (formato de
chat real) e simulacao de ligacao (roteiro por etapas: abertura, qualificacao,
apresentacao, contorno de objecao, fechamento). Use como base os exemplos reais
do briefing sempre que existirem; quando nao houver exemplo real suficiente,
construa um cenario plausivel e generico para o segmento do cliente, deixando
claro que e um exemplo de pratica — nunca atribua a fala a uma pessoa real sem
uma fonte no briefing.
`;

export function planPrompt(business: Business) {
  const ctxParsed = business.context ? contextSchema.safeParse(business.context) : null;
  const briefing = ctxParsed?.success ? contextBriefing(ctxParsed.data) : "";

  const system = `Voce e o planejador de um gerador de apresentacoes de treinamento comercial da Pulso.
${BRAND_BRIEF}
${ETAPAS_BRIEF}

Sua tarefa agora e so planejar o ESCOPO: quantas dores, quantas estrategias e
quantos cenarios de roleplay fazem sentido dado o volume de informacao
disponivel. Nao escreva o conteudo final ainda.

Responda SOMENTE com JSON valido, no formato:
{
  "analysis": { "principaisDores": [], "principaisMetricas": [], "focoDoTreinamento": "" },
  "outline": { "dores": 3, "estrategias": 2, "cenariosWhatsapp": 2, "cenariosLigacao": 1 },
  "meta": { "titulo": "", "cliente": "", "segmento": "" }
}

"focoDoTreinamento" e uma frase curta dizendo qual e o ganho central que este
treinamento especifico precisa entregar, com base nas dores e metricas do
briefing. "titulo" e o titulo da apresentacao, ex.: "Treinamento Comercial — {cliente}".`;

  const user = `Dados preenchidos no formulario:
Cliente: ${business.cliente}
Segmento: ${business.segmento || "-"}
Processo atual (digitado): ${business.processoAtual || "-"}
Dores (digitado): ${business.dores || "-"}
Estrategias executadas (digitado): ${business.estrategiasExecutadas || "-"}
Metricas (digitado): ${business.metricas || "-"}
Observacoes: ${business.observacoes || "-"}

Briefing extraido do material bruto (quando existir, tem prioridade sobre o formulario):
${briefing || "(nenhum material bruto foi anexado)"}

Planeje o escopo do treinamento.`;

  return { system, user };
}

export function contentPrompt(business: Business, plan: Plan) {
  const ctxParsed = business.context ? contextSchema.safeParse(business.context) : null;
  const briefing = ctxParsed?.success ? contextBriefing(ctxParsed.data) : "";
  const exemplos = ctxParsed?.success ? contextExemplos(ctxParsed.data) : "";

  const system = `Voce escreve o conteudo completo de uma apresentacao de treinamento comercial da Pulso.
${BRAND_BRIEF}
${ETAPAS_BRIEF}

Escopo ja definido pelo planejamento: ${plan.outline.dores} dor(es),
${plan.outline.estrategias} estrategia(s) executada(s), ${plan.outline.cenariosWhatsapp}
cenario(s) de WhatsApp e ${plan.outline.cenariosLigacao} cenario(s) de ligacao.

Responda SOMENTE com um objeto JSON valido, sem markdown, no formato exato:
{
  "etapa1": {
    "processoAtual": { "canais": ["whatsapp"], "descricao": "" },
    "dores": [ { "titulo": "", "detalhe": "" } ]
  },
  "etapa2": {
    "estrategiasExecutadas": [ { "nome": "", "descricao": "", "resultado": "" } ],
    "indicadores": [ { "label": "Tempo de tela", "atual": "", "meta": "", "variacao": "" } ]
  },
  "etapa3": {
    "roleplayWhatsapp": [
      {
        "titulo": "",
        "contexto": "",
        "mensagens": [ { "autor": "consultor", "texto": "" }, { "autor": "cliente", "texto": "" } ]
      }
    ],
    "roleplayLigacao": [
      {
        "titulo": "",
        "contexto": "",
        "roteiro": [
          { "etapa": "Abertura", "falaSugerida": "", "objecaoComum": "", "respostaObjecao": "" },
          { "etapa": "Qualificacao", "falaSugerida": "" },
          { "etapa": "Apresentacao", "falaSugerida": "" },
          { "etapa": "Contorno de objecao", "falaSugerida": "", "objecaoComum": "", "respostaObjecao": "" },
          { "etapa": "Fechamento", "falaSugerida": "" }
        ]
      }
    ]
  },
  "materialApoio": {
    "scriptLigacao": {
      "abertura": "",
      "qualificacao": "",
      "apresentacao": "",
      "objecoes": [ { "objecao": "", "resposta": "" } ],
      "fechamento": ""
    },
    "cronogramaFollowup": [
      { "dia": "D+1", "canal": "whatsapp", "objetivo": "", "mensagemExemplo": "" }
    ]
  }
}

Regras:
- "roleplayWhatsapp.mensagens" alterna consultor/cliente de forma realista, como
  uma conversa de verdade (6 a 14 mensagens por cenario). Priorize reaproveitar
  os exemplos reais de WhatsApp abaixo, adaptando so o necessario; se nao houver
  exemplo real, construa uma simulacao plausivel para pratica e deixe isso
  implicito no "contexto" (ex.: "Cenario de pratica — objecao de preco").
  Sempre a mensagem PARTE DO CONSULTOR abrindo o roleplay.
- "roleplayLigacao.roteiro" segue sempre as 5 etapas na ordem: Abertura,
  Qualificacao, Apresentacao, Contorno de objecao, Fechamento.
- "materialApoio.scriptLigacao" e o script FINAL, pronto para uso, nao um exemplo
  de pratica — deve ser directamente utilizavel pelo time do cliente na proxima
  ligacao real.
- "cronogramaFollowup" tem entre 4 e 8 linhas cobrindo pelo menos 15 dias corridos
  apos o primeiro contato, com pelo menos uma reativacao (contato depois de
  silencio do lead).
- Nunca atribua uma fala do roleplay a uma pessoa real do briefing como se fosse
  transcricao literal, a menos que o texto venha de um exemplo real abaixo.`;

  const user = `Cliente: ${business.cliente}
Segmento: ${business.segmento || plan.meta.segmento || "-"}
Foco do treinamento: ${plan.analysis.focoDoTreinamento}
Dores identificadas: ${plan.analysis.principaisDores.join(" | ") || "-"}
Metricas identificadas: ${plan.analysis.principaisMetricas.join(" | ") || "-"}

Briefing resumido:
${briefing || "(nenhum material bruto foi anexado)"}

Exemplos reais de conversa (use como base do roleplay quando existirem):
${exemplos || "(nenhum exemplo real disponivel — construa cenarios de pratica plausiveis)"}

Escreva o conteudo completo.`;

  return { system, user };
}

export function repairPrompt(problemas: string[], candidato: unknown) {
  const system = `O JSON abaixo tem problemas de validacao. Corrija SOMENTE o necessario para
resolver os problemas listados, mantendo todo o resto do conteudo identico.
Responda com o objeto JSON completo e corrigido, no mesmo formato, sem markdown.`;
  const user = `Problemas encontrados:\n${problemas.map((p) => `- ${p}`).join("\n")}\n\nJSON atual:\n${JSON.stringify(candidato)}`;
  return { system, user };
}
