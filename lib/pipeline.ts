import { generateJson } from "./ai";
import { updateTreinamentoAdmin } from "./repo";
import { contentPrompt1, contentPrompt2, planPrompt } from "./prompt";
import { planSchema, type Business, type Plan, type TreinamentoSpec } from "./schema";
import { normalize, validate } from "./validate";

import type { StepId } from "./steps";

export type Emit = (event: {
  step: StepId;
  state: "running" | "done" | "error";
  detail?: string;
}) => void;

/**
 * O pipeline roda em TRES requisicoes separadas (planejar, etapas 1+2, etapa
 * 3), igual aos outros geradores da Pulso mas com um passo a mais: funcoes
 * serverless tem teto de 60s no plano Hobby da Vercel, sem excecao, e gerar
 * etapa1+etapa2+etapa3+materialApoio numa chamada so estourava esse teto —
 * a etapa 3 (roleplay com conversa real) e a parte mais pesada, entao ganhou
 * a propria requisicao.
 */

export interface ConteudoParcial {
  etapa1: unknown;
  etapa2: unknown;
  materialApoio: unknown;
}

/* ----------------------- etapa 1: analisar e planejar --------------------- */

export async function planTreinamento(business: Business, emit: Emit): Promise<Plan> {
  emit({ step: "analise", state: "running" });
  const informed = [business.processoAtual, business.dores, business.estrategiasExecutadas, business.metricas].filter(
    (v) => v && v.trim(),
  ).length;
  emit({
    step: "analise",
    state: "done",
    detail: `${business.cliente} · ${informed} blocos de informação`,
  });

  emit({ step: "escopo", state: "running" });

  // Uma unica chamada: generateJson ja tenta de novo sozinho quando o JSON
  // vem malformado (ver lib/ai.ts). Um laco aqui por cima faria ate duas
  // chamadas completas dentro da mesma requisicao de 60s — foi exatamente
  // esse padrao que estourava o tempo na etapa de conteudo.
  const prompts = planPrompt(business);
  const raw = await generateJson(prompts.system, prompts.user, 3000);
  const parsed = planSchema.safeParse(raw);

  if (!parsed.success) {
    emit({ step: "escopo", state: "error", detail: parsed.error.issues[0]?.message });
    throw new Error("A IA não conseguiu planejar o treinamento no formato esperado. Tente gerar novamente.");
  }
  const plan = parsed.data;
  emit({
    step: "escopo",
    state: "done",
    detail: `${plan.outline.dores} dor(es) · ${plan.outline.cenariosWhatsapp} cenário(s) WhatsApp · ${plan.outline.cenariosLigacao} cenário(s) ligação`,
  });

  return plan;
}

/* --------------- etapa 2: escrever etapas 1+2 e material de apoio --------- */

export async function buildConteudo1(business: Business, plan: Plan, emit: Emit): Promise<ConteudoParcial> {
  emit({ step: "conteudo", state: "running" });
  const prompts = contentPrompt1(business, plan);
  const raw = (await generateJson(prompts.system, prompts.user, 4000, "conteudo")) as Record<string, unknown>;
  emit({ step: "conteudo", state: "done", detail: "Etapas 1 e 2 escritas" });

  return {
    etapa1: raw.etapa1 ?? {},
    etapa2: raw.etapa2 ?? {},
    materialApoio: raw.materialApoio ?? {},
  };
}

/* ------------- etapa 3: escrever roleplay, validar e publicar ------------- */

export async function buildConteudo2(
  id: string,
  business: Business,
  plan: Plan,
  parcial: ConteudoParcial,
  emit: Emit,
): Promise<TreinamentoSpec> {
  emit({ step: "roleplay", state: "running" });
  const prompts = contentPrompt2(business, plan, parcial);
  const rawEtapa3 = (await generateJson(prompts.system, prompts.user, 4000, "conteudo")) as Record<string, unknown>;
  emit({ step: "roleplay", state: "done", detail: "Roleplay de WhatsApp e ligação escrito" });

  emit({ step: "montagem", state: "running" });
  let candidate: unknown = normalize(
    {
      meta: plan.meta,
      etapa1: parcial.etapa1,
      etapa2: parcial.etapa2,
      etapa3: rawEtapa3.etapa3 ?? {},
      materialApoio: parcial.materialApoio,
    },
    business,
  );
  emit({ step: "montagem", state: "done" });

  emit({ step: "validacao", state: "running" });
  const result = validate(candidate, business);

  // Sem correcao automatica aqui: essa rota ja fez uma chamada de IA (a etapa
  // 3) dentro do teto de 60s do plano Hobby da Vercel. Uma segunda chamada de
  // correcao, na mesma requisicao, e exatamente o que estourava o tempo antes
  // — as vezes as duas juntas passavam do limite mesmo cada uma cabendo
  // sozinha. Falha rara e clara aqui vale mais que travar silenciosamente.
  if (!result.ok || !result.spec) {
    emit({ step: "validacao", state: "error", detail: result.fatal.slice(0, 2).join(" | ") });
    throw new Error(`Treinamento inválido: ${result.fatal.slice(0, 3).join(" | ")}. Tente gerar novamente.`);
  }

  emit({
    step: "validacao",
    state: "done",
    detail: result.warnings.length ? `${result.warnings.length} aviso(s) menor(es)` : "Nenhum problema encontrado",
  });

  emit({ step: "publicacao", state: "running" });
  const saved = await updateTreinamentoAdmin(id, {
    spec: result.spec,
    status: "pronto",
    issues: result.warnings,
    error: null,
    published_at: new Date().toISOString(),
  });
  emit({ step: "publicacao", state: "done", detail: `/t/${saved.slug}` });

  return result.spec;
}
