import { generateJson } from "./ai";
import { updateTreinamentoAdmin } from "./repo";
import { contentPrompt, planPrompt, repairPrompt } from "./prompt";
import { planSchema, type Business, type Plan, type TreinamentoSpec } from "./schema";
import { normalize, validate } from "./validate";

import type { StepId } from "./steps";

export type Emit = (event: {
  step: StepId;
  state: "running" | "done" | "error";
  detail?: string;
}) => void;

/**
 * O pipeline roda em duas requisicoes separadas (planejar e construir), igual
 * aos outros geradores da Pulso: funcoes serverless tem teto de 60s no plano
 * Hobby da Vercel, e as duas chamadas de IA somadas passariam disso.
 */

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

  let parsed: ReturnType<typeof planSchema.safeParse> | null = null;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const prompts = planPrompt(business);
    const raw = await generateJson(prompts.system, prompts.user, 3000);
    parsed = planSchema.safeParse(raw);
    if (parsed.success) break;
  }

  if (!parsed?.success) {
    emit({ step: "escopo", state: "error", detail: parsed?.error.issues[0]?.message });
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

/* ------------------- etapa 2: escrever, validar e publicar ---------------- */

export async function buildTreinamento(
  id: string,
  business: Business,
  plan: Plan,
  emit: Emit,
): Promise<TreinamentoSpec> {
  emit({ step: "conteudo", state: "running" });
  const prompts = contentPrompt(business, plan);
  const rawContent = (await generateJson(prompts.system, prompts.user, 10000, "conteudo")) as Record<string, unknown>;
  emit({ step: "conteudo", state: "done", detail: "Etapas 1, 2 e 3 escritas" });

  emit({ step: "montagem", state: "running" });
  let candidate: unknown = normalize(
    {
      meta: plan.meta,
      etapa1: rawContent.etapa1 ?? {},
      etapa2: rawContent.etapa2 ?? {},
      etapa3: rawContent.etapa3 ?? {},
      materialApoio: rawContent.materialApoio ?? {},
    },
    business,
  );
  emit({ step: "montagem", state: "done" });

  emit({ step: "validacao", state: "running" });
  let result = validate(candidate, business);

  if (!result.ok) {
    emit({ step: "validacao", state: "running", detail: "Corrigindo problemas encontrados…" });
    const fix = repairPrompt(result.fatal, candidate);
    try {
      const repaired = await generateJson(fix.system, fix.user, 10000, "conteudo");
      candidate = normalize(repaired, business);
      result = validate(candidate, business);
    } catch {
      /* mantem o resultado anterior; o erro abaixo cobre o caso */
    }
  }

  if (!result.ok || !result.spec) {
    emit({ step: "validacao", state: "error", detail: result.fatal.slice(0, 2).join(" | ") });
    throw new Error(`Treinamento inválido após correção: ${result.fatal.slice(0, 3).join(" | ")}`);
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
