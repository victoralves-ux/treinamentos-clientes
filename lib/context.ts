import { z } from "zod";

/**
 * Briefing estruturado de treinamento.
 *
 * O consultor cola o material bruto que ja tem sobre o cliente — atas de
 * reuniao, protocolos internos, trechos de conversas reais no WhatsApp,
 * transcricoes de ligacao, planilhas de metrica exportadas como texto — e a
 * IA organiza. A regra que governa tudo aqui e a mesma dos outros geradores
 * da Pulso: nao inventar. Campo sem informacao no material vira null ou lista
 * vazia — nunca completado com suposicao.
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
 * O briefing e extraido em DUAS chamadas de IA, cada uma a partir de um
 * arquivo separado que o consultor sobe (ver lib/prompt-consultor.ts) — nao
 * uma so a partir de um documento unico. Motivo: o mesmo teto de 60s da
 * funcao serverless da Vercel (Hobby) que limita a geracao do treinamento.
 * Dividir em duas chamadas menores, cada uma com seu proprio teto de 24.000
 * caracteres de entrada (lib/extrair-texto.ts), da na pratica ~48.000
 * caracteres de material bruto sem truncar nada — o dobro da capacidade de
 * uma chamada unica, sem precisar aumentar o teto de nenhuma delas.
 */
const REGRA_BASE = `Voce organiza material de treinamento comercial para a Pulso, uma
consultoria que treina equipes de vendas de clientes high ticket.

Recebe material bruto (atas de reuniao, protocolos internos, trechos reais de
conversas no WhatsApp, transcricoes de ligacao, planilhas de metrica exportadas
como texto) e extrai um briefing estruturado para montar o treinamento.

Responda SOMENTE com um objeto JSON valido, sem markdown e sem comentarios.
Atencao ao formato: aspas duplas, escape de aspas dentro de textos, sem quebra
de linha dentro de string e sem virgula sobrando antes de } ou ].

REGRA QUE GOVERNA TUDO: nao inventar. Se a informacao nao estiver no material,
o campo recebe null (ou lista vazia). Nunca preencha por suposicao, nunca
complete com frase generica.

Ruim:  "O time tem dificuldade em converter leads."
Bom:   "Taxa de conversao de call para venda caiu de 18% para 11% no ultimo mes."`;

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

/** Arquivo 1: identificacao do cliente, processo atual, dores e metricas. */
export function contextPromptDiagnostico(raw: string) {
  const system = `${REGRA_BASE}

Nesta chamada voce extrai SOMENTE o diagnostico do cliente. Estrategias ja
executadas, exemplos reais de conversa, script de ligacao e cronograma de
follow-up vem de um segundo arquivo, numa segunda chamada — nao se preocupe
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

Observacoes por campo:
- "dores": dores do PROCESSO COMERCIAL do cliente (o que trava a conversao), nao
  dores do produto/servico dele. Ex.: "time perde o timing do follow-up",
  "vendedor nao sabe contornar objecao de preco".
- "canais": so entram canais que o material efetivamente cita, usando exatamente
  um destes valores: whatsapp, ligacao, call, email, instagram, sms, presencial,
  outro.
- "metricas": qualquer numero de desempenho comercial citado — tempo de tela,
  taxa de conversao, ticket medio, numero de leads, taxa de resposta etc.
- "restricoes": o que o cliente pediu para nao fazer ou nao usar no treinamento.`;

  const user = `Material bruto sobre o cliente — arquivo 1 de 2 (diagnostico):\n\n${raw}\n\nExtraia cliente, processo atual, dores, metricas, restricoes e observacoes.`;
  return { system, user };
}

/** Arquivo 2: o que ja foi executado e os exemplos reais de conversa. */
export function contextPromptExecucao(raw: string) {
  const system = `${REGRA_BASE}

Nesta chamada voce extrai SOMENTE o que ja foi executado e os exemplos reais
de conversa. Identificacao do cliente, processo atual, dores e metricas vem
de um primeiro arquivo, ja extraido em outra chamada — nao se preocupe com
eles aqui, mesmo que apareçam de passagem no material.

Preserve numeros, nomes, trechos literais de conversa e termos tecnicos exatamente
como aparecem — sobretudo em "exemplos_whatsapp" e "exemplos_ligacao": esses
trechos viram a base do roleplay interativo do treinamento, entao precisam ser
reais, nao parafraseados.

Formato exato da resposta:
{
  "estrategias_executadas": [ { "nome": "", "descricao": null, "resultado": null } ],
  "exemplos_whatsapp": [ { "titulo": "", "contexto": null, "mensagens": [ { "autor": "consultor ou cliente", "texto": "" } ] } ],
  "exemplos_ligacao": [ { "titulo": "", "contexto": null, "transcricao": null } ],
  "script_ligacao_atual": { "abertura": null, "qualificacao": null, "apresentacao": null, "objecoes": [ { "objecao": "", "resposta": "" } ], "fechamento": null },
  "cronograma_followup_atual": [ { "dia": "", "canal": "", "objetivo": null, "mensagem_exemplo": null } ]
}

Observacoes por campo:
- "exemplos_whatsapp"/"exemplos_ligacao": so entram trechos que realmente
  aparecem no material. Sem exemplo real, devolva lista vazia — o roleplay
  usa esses trechos como base e nao pode receber conversa inventada.
  LIMITE OBRIGATORIO (a resposta precisa caber num teto de tokens): no maximo
  3 cenarios em "exemplos_whatsapp", cada um com no maximo 12 mensagens; no
  maximo 2 cenarios em "exemplos_ligacao", cada "transcricao" com no maximo
  1200 caracteres. Se o material tiver mais conversa real do que isso, escolha
  os trechos mais representativos das dores identificadas — nunca tente
  incluir tudo, e nunca corte uma mensagem ou um objeto no meio: prefira
  devolver menos exemplos completos a arriscar um JSON truncado.`;

  const user = `Material bruto sobre o cliente — arquivo 2 de 2 (execucao e exemplos):\n\n${raw}\n\nExtraia estrategias executadas, exemplos reais de conversa, script de ligacao e cronograma de follow-up.`;
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
 * prompt grande o bastante para a chamada estourar o tempo da funcao.
 */
const MAX_BRIEFING_CHARS = 3000;

/** Versao curta do briefing, injetada nos prompts de geracao do treinamento. */
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
    if (e.nome) linhas.push(`- Estrategia executada "${e.nome}": ${[e.descricao, e.resultado].filter(Boolean).join(" — ").slice(0, 200)}`);
  }
  for (const m of ctx.metricas ?? []) {
    if (m.label) linhas.push(`- Metrica "${m.label}": atual ${m.atual ?? "?"}, meta ${m.meta ?? "?"}${m.variacao ? ` (${m.variacao})` : ""}`);
  }

  add("Restricoes", ctx.restricoes);
  add("Observacoes", ctx.observacoes);

  const texto = linhas.join("\n");
  return texto.length > MAX_BRIEFING_CHARS ? `${texto.slice(0, MAX_BRIEFING_CHARS)}…` : texto;
}

/**
 * Exemplos reais de WhatsApp/ligacao formatados para injecao no prompt de
 * conteudo. Ficam fora do resumo curto porque sao a materia-prima do roleplay
 * e precisam chegar literais, nao resumidos.
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
    if (c.transcricao) blocos.push(`[Ligacao real${c.titulo ? ` — ${c.titulo}` : ""}]\n${c.transcricao}`);
  }
  if (ctx.script_ligacao_atual?.abertura || ctx.script_ligacao_atual?.fechamento) {
    const s = ctx.script_ligacao_atual;
    blocos.push(
      `[Script de ligacao ja usado pelo cliente]\nAbertura: ${s.abertura ?? "-"}\nQualificacao: ${s.qualificacao ?? "-"}\nApresentacao: ${s.apresentacao ?? "-"}\nFechamento: ${s.fechamento ?? "-"}`,
    );
  }
  if (ctx.cronograma_followup_atual?.length) {
    blocos.push(
      `[Cronograma de follow-up ja usado]\n${ctx.cronograma_followup_atual
        .map((c) => `Dia ${c.dia ?? "?"} · ${c.canal ?? "?"} · ${c.objetivo ?? ""}`)
        .join("\n")}`,
    );
  }

  const texto = blocos.join("\n\n");
  return texto.length > MAX_EXEMPLOS_CHARS ? `${texto.slice(0, MAX_EXEMPLOS_CHARS)}…` : texto;
}
