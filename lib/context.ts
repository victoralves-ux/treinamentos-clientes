import { z } from "zod";

/**
 * Briefing estruturado de treinamento.
 *
 * O consultor cola o material bruto que já tem sobre o cliente — atas de
 * reunião, protocolos internos, trechos de conversas reais no WhatsApp,
 * transcrições de ligação, planilhas de métrica exportadas como texto — e a
 * IA organiza. A regra que governa tudo aqui é a mesma dos outros geradores
 * da Pulso: não inventar. Campo sem informação no material vira null ou lista
 * vazia — nunca completado com suposição.
 */

const texto = z.string().nullish().transform((v) => (v ?? "").trim() || null);
const lista = z
  .union([z.array(z.string()), z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
    if (typeof v === "string" && v.trim()) return [v.trim()];
    return [];
  });

export const contextSchema = z.object({
  cliente: z
    .object({
      nome: texto,
      segmento: texto,
      ticket_medio: texto,
      consultor_responsavel: texto,
    })
    .partial()
    .catch({}),

  processo_atual: z
    .object({
      canais: lista,
      descricao: texto,
      ferramentas: lista,
    })
    .partial()
    .catch({}),

  dores: z.array(z.object({ titulo: texto, detalhe: texto })).catch([]),

  estrategias_executadas: z
    .array(
      z.object({
        nome: texto,
        descricao: texto,
        resultado: texto,
      }),
    )
    .catch([]),

  metricas: z
    .array(
      z.object({
        label: texto,
        atual: texto,
        meta: texto,
        variacao: texto,
      }),
    )
    .catch([]),

  exemplos_whatsapp: z
    .array(
      z.object({
        titulo: texto,
        contexto: texto,
        mensagens: z
          .array(z.object({ autor: texto, texto: texto }))
          .catch([]),
      }),
    )
    .catch([]),

  exemplos_ligacao: z
    .array(
      z.object({
        titulo: texto,
        contexto: texto,
        transcricao: texto,
      }),
    )
    .catch([]),

  script_ligacao_atual: z
    .object({
      abertura: texto,
      qualificacao: texto,
      apresentacao: texto,
      objecoes: z.array(z.object({ objecao: texto, resposta: texto })).catch([]),
      fechamento: texto,
    })
    .partial()
    .catch({}),

  cronograma_followup_atual: z
    .array(
      z.object({
        dia: texto,
        canal: texto,
        objetivo: texto,
        mensagem_exemplo: texto,
      }),
    )
    .catch([]),

  restricoes: lista,
  observacoes: lista,
});

export type ClientContext = z.infer<typeof contextSchema>;

/**
 * O briefing é extraído em DUAS chamadas de IA, cada uma a partir de um
 * arquivo separado que o consultor sobe (ver lib/prompt-consultor.ts) — não
 * uma só a partir de um documento único. Motivo: o mesmo teto de 60s da
 * função serverless da Vercel (Hobby) que limita a geração do treinamento.
 * Dividir em duas chamadas menores, cada uma com seu próprio teto de 24.000
 * caracteres de entrada (lib/extrair-texto.ts), dá na prática ~48.000
 * caracteres de material bruto sem truncar nada — o dobro da capacidade de
 * uma chamada única, sem precisar aumentar o teto de nenhuma delas.
 */
const REGRA_BASE = `Você organiza material de treinamento comercial para a Pulso, uma
consultoria que treina equipes de vendas de clientes high ticket.

Recebe material bruto (atas de reunião, protocolos internos, trechos reais de
conversas no WhatsApp, transcrições de ligação, planilhas de métrica exportadas
como texto) e extrai um briefing estruturado para montar o treinamento.

Responda SOMENTE com um objeto JSON válido, sem markdown e sem comentários.
Atenção ao formato: aspas duplas, escape de aspas dentro de textos, sem quebra
de linha dentro de string e sem vírgula sobrando antes de } ou ].

PORTUGUÊS CORRETO, SEMPRE (norma culta, padrão ABNT): acentuação e cedilha
completas em todo texto livre — "não", "é", "conversão", "atenção", "serviço"
— nunca sem o acento ou a cedilha. Isso não vale para os nomes dos campos do
JSON (ficam em inglês/snake_case, sem acento, exatamente como no formato
abaixo).

REGRA QUE GOVERNA TUDO: não inventar. Se a informação não estiver no material,
o campo recebe null (ou lista vazia). Nunca preencha por suposição, nunca
complete com frase genérica.

Ruim:  "O time tem dificuldade em converter leads."
Bom:   "Taxa de conversão de call para venda caiu de 18% para 11% no último mês."`;

export const contextSchemaDiagnostico = contextSchema.pick({
  cliente: true,
  processo_atual: true,
  dores: true,
  metricas: true,
  restricoes: true,
  observacoes: true,
});

export const contextSchemaExecucao = contextSchema.pick({
  estrategias_executadas: true,
  exemplos_whatsapp: true,
  exemplos_ligacao: true,
  script_ligacao_atual: true,
  cronograma_followup_atual: true,
});

/** Arquivo 1: identificação do cliente, processo atual, dores e métricas. */
export function contextPromptDiagnostico(raw: string) {
  const system = `${REGRA_BASE}

Nesta chamada você extrai SOMENTE o diagnóstico do cliente. Estratégias já
executadas, exemplos reais de conversa, script de ligação e cronograma de
follow-up vêm de um segundo arquivo, numa segunda chamada — não se preocupe
com eles aqui, mesmo que apareçam de passagem no material.

Formato exato da resposta:
{
  "cliente": { "nome": null, "segmento": null, "ticket_medio": null, "consultor_responsavel": null },
  "processo_atual": { "canais": [], "descricao": null, "ferramentas": [] },
  "dores": [ { "titulo": "", "detalhe": null } ],
  "metricas": [ { "label": "", "atual": null, "meta": null, "variacao": null } ],
  "restricoes": [],
  "observacoes": []
}

Observações por campo:
- "dores": dores do PROCESSO COMERCIAL do cliente (o que trava a conversão), não
  dores do produto/serviço dele. Ex.: "time perde o timing do follow-up",
  "vendedor não sabe contornar objeção de preço".
- "canais": só entram canais que o material efetivamente cita, usando exatamente
  um destes valores: whatsapp, ligacao, call, email, instagram, sms, presencial,
  outro.
- "metricas": qualquer número de desempenho comercial citado — tempo de tela,
  taxa de conversão, ticket médio, número de leads, taxa de resposta etc.
- "restricoes": o que o cliente pediu para não fazer ou não usar no treinamento.`;

  const user = `Material bruto sobre o cliente — arquivo 1 de 2 (diagnóstico):\n\n${raw}\n\nExtraia cliente, processo atual, dores, métricas, restrições e observações.`;
  return { system, user };
}

/** Arquivo 2: o que já foi executado e os exemplos reais de conversa. */
export function contextPromptExecucao(raw: string) {
  const system = `${REGRA_BASE}

Nesta chamada você extrai SOMENTE o que já foi executado e os exemplos reais
de conversa. Identificação do cliente, processo atual, dores e métricas vêm
de um primeiro arquivo, já extraído em outra chamada — não se preocupe com
eles aqui, mesmo que apareçam de passagem no material.

Preserve números, nomes, trechos literais de conversa e termos técnicos exatamente
como aparecem — sobretudo em "exemplos_whatsapp" e "exemplos_ligacao": esses
trechos viram a base do roleplay interativo do treinamento, então precisam ser
reais, não parafraseados.

Formato exato da resposta:
{
  "estrategias_executadas": [ { "nome": "", "descricao": null, "resultado": null } ],
  "exemplos_whatsapp": [ { "titulo": "", "contexto": null, "mensagens": [ { "autor": "consultor ou cliente", "texto": "" } ] } ],
  "exemplos_ligacao": [ { "titulo": "", "contexto": null, "transcricao": null } ],
  "script_ligacao_atual": { "abertura": null, "qualificacao": null, "apresentacao": null, "objecoes": [ { "objecao": "", "resposta": "" } ], "fechamento": null },
  "cronograma_followup_atual": [ { "dia": "", "canal": "", "objetivo": null, "mensagem_exemplo": null } ]
}

Observações por campo:
- "exemplos_whatsapp"/"exemplos_ligacao": só entram trechos que realmente
  aparecem no material. Sem exemplo real, devolva lista vazia — o roleplay
  usa esses trechos como base e não pode receber conversa inventada.
  LIMITE OBRIGATÓRIO (a resposta precisa caber num teto de tokens): no máximo
  3 cenários em "exemplos_whatsapp", cada um com no máximo 12 mensagens; no
  máximo 2 cenários em "exemplos_ligacao", cada "transcricao" com no máximo
  1200 caracteres. Se o material tiver mais conversa real do que isso, escolha
  os trechos mais representativos das dores identificadas — nunca tente
  incluir tudo, e nunca corte uma mensagem ou um objeto no meio: prefira
  devolver menos exemplos completos a arriscar um JSON truncado.`;

  const user = `Material bruto sobre o cliente — arquivo 2 de 2 (execução e exemplos):\n\n${raw}\n\nExtraia estratégias executadas, exemplos reais de conversa, script de ligação e cronograma de follow-up.`;
  return { system, user };
}

/** Junta os dois briefings parciais no formato completo usado pelo resto do app. */
export function mergeContext(
  diagnostico?: z.infer<typeof contextSchemaDiagnostico> | null,
  execucao?: z.infer<typeof contextSchemaExecucao> | null,
): ClientContext {
  return {
    cliente: diagnostico?.cliente ?? {},
    processo_atual: diagnostico?.processo_atual ?? {},
    dores: diagnostico?.dores ?? [],
    metricas: diagnostico?.metricas ?? [],
    restricoes: diagnostico?.restricoes ?? [],
    observacoes: diagnostico?.observacoes ?? [],
    estrategias_executadas: execucao?.estrategias_executadas ?? [],
    exemplos_whatsapp: execucao?.exemplos_whatsapp ?? [],
    exemplos_ligacao: execucao?.exemplos_ligacao ?? [],
    script_ligacao_atual: execucao?.script_ligacao_atual ?? {},
    cronograma_followup_atual: execucao?.cronograma_followup_atual ?? [],
  };
}

/**
 * Teto do briefing injetado no prompt. Sem limite, um material rico gerava um
 * prompt grande o bastante para a chamada estourar o tempo da função.
 */
const MAX_BRIEFING_CHARS = 3000;

/** Versão curta do briefing, injetada nos prompts de geração do treinamento. */
export function contextBriefing(ctx: ClientContext): string {
  const linhas: string[] = [];
  const add = (rotulo: string, valor: unknown) => {
    if (!valor) return;
    if (Array.isArray(valor)) {
      if (!valor.length) return;
      linhas.push(`- ${rotulo}: ${valor.join(" | ")}`);
    } else {
      linhas.push(`- ${rotulo}: ${valor}`);
    }
  };

  add("Processo atual", ctx.processo_atual?.descricao);
  add("Canais usados", ctx.processo_atual?.canais);
  add("Ferramentas", ctx.processo_atual?.ferramentas);

  for (const d of ctx.dores ?? []) {
    if (d.titulo) linhas.push(`- Dor: ${d.titulo}${d.detalhe ? ` — ${d.detalhe.slice(0, 160)}` : ""}`);
  }
  for (const e of ctx.estrategias_executadas ?? []) {
    if (e.nome) linhas.push(`- Estratégia executada "${e.nome}": ${[e.descricao, e.resultado].filter(Boolean).join(" — ").slice(0, 200)}`);
  }
  for (const m of ctx.metricas ?? []) {
    if (m.label) linhas.push(`- Métrica "${m.label}": atual ${m.atual ?? "?"}, meta ${m.meta ?? "?"}${m.variacao ? ` (${m.variacao})` : ""}`);
  }

  add("Restrições", ctx.restricoes);
  add("Observações", ctx.observacoes);

  const texto = linhas.join("\n");
  return texto.length > MAX_BRIEFING_CHARS ? `${texto.slice(0, MAX_BRIEFING_CHARS)}…` : texto;
}

/**
 * Exemplos reais de WhatsApp/ligação formatados para injeção no prompt de
 * conteúdo. Ficam fora do resumo curto porque são a matéria-prima do roleplay
 * e precisam chegar literais, não resumidos.
 */
const MAX_EXEMPLOS_CHARS = 6000;

export function contextExemplos(ctx: ClientContext): string {
  const blocos: string[] = [];

  for (const c of ctx.exemplos_whatsapp ?? []) {
    const msgs = (c.mensagens ?? [])
      .filter((m) => m.texto)
      .map((m) => `${m.autor ?? "?"}: ${m.texto}`)
      .join("\n");
    if (msgs) blocos.push(`[WhatsApp real${c.titulo ? ` — ${c.titulo}` : ""}]\n${msgs}`);
  }
  for (const c of ctx.exemplos_ligacao ?? []) {
    if (c.transcricao) blocos.push(`[Ligação real${c.titulo ? ` — ${c.titulo}` : ""}]\n${c.transcricao}`);
  }
  if (ctx.script_ligacao_atual?.abertura || ctx.script_ligacao_atual?.fechamento) {
    const s = ctx.script_ligacao_atual;
    blocos.push(
      `[Script de ligação já usado pelo cliente]\nAbertura: ${s.abertura ?? "-"}\nQualificação: ${s.qualificacao ?? "-"}\nApresentação: ${s.apresentacao ?? "-"}\nFechamento: ${s.fechamento ?? "-"}`,
    );
  }
  if (ctx.cronograma_followup_atual?.length) {
    blocos.push(
      `[Cronograma de follow-up já usado]\n${ctx.cronograma_followup_atual
        .map((c) => `Dia ${c.dia ?? "?"} · ${c.canal ?? "?"} · ${c.objetivo ?? ""}`)
        .join("\n")}`,
    );
  }

  const texto = blocos.join("\n\n");
  return texto.length > MAX_EXEMPLOS_CHARS ? `${texto.slice(0, MAX_EXEMPLOS_CHARS)}…` : texto;
}
