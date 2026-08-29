import { treinamentoSpecSchema, type Business, type TreinamentoSpec } from "./schema";

const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /\[[^\]]*(inserir|seu|sua|exemplo|texto aqui)[^\]]*\]/i,
  /\{\{[^}]*\}\}/,
  /\bTODO\b/,
  /xxx+/i,
  /placeholder/i,
];

/** Percorre o JSON e devolve apenas os textos escritos pela IA. */
function textValues(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => textValues(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => textValues(v, out));
  return out;
}

/**
 * Corrige o que da para corrigir sem IA e injeta os dados que vieram do
 * formulario por cima do que o modelo escreveu (cliente, segmento, data —
 * esses nunca sao inventados pela IA).
 */
export function normalize(raw: unknown, b: Business): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const spec = JSON.parse(JSON.stringify(raw)) as Record<string, any>;

  spec.meta = spec.meta ?? {};
  spec.meta.cliente = b.cliente;
  spec.meta.segmento = spec.meta.segmento || b.segmento || "";
  spec.meta.data = b.dataTreinamento || "";
  spec.meta.titulo = spec.meta.titulo || `Treinamento Comercial — ${b.cliente}`;

  spec.etapa1 = spec.etapa1 ?? {};
  spec.etapa1.processoAtual = spec.etapa1.processoAtual ?? {};
  if (!Array.isArray(spec.etapa1.processoAtual.canais) || !spec.etapa1.processoAtual.canais.length) {
    spec.etapa1.processoAtual.canais = ["whatsapp", "ligacao", "call"];
  }

  // Roteiro de ligação sempre nas 5 etapas, na ordem certa: se o modelo
  // pulou uma, a simulação interativa fica quebrada no meio. Precisa bater
  // exatamente com os valores de "etapa" pedidos em lib/prompt.ts
  // (contentPrompt2) — inclusive a acentuação.
  const ORDEM = ["Abertura", "Qualificação", "Apresentação", "Contorno de objeção", "Fechamento"];
  for (const cenario of spec.etapa3?.roleplayLigacao ?? []) {
    if (!Array.isArray(cenario.roteiro)) continue;
    const porEtapa = new Map(cenario.roteiro.map((r: any) => [String(r.etapa ?? "").trim(), r]));
    cenario.roteiro = ORDEM.map(
      (etapa) => porEtapa.get(etapa) ?? { etapa, falaSugerida: "", objecaoComum: "", respostaObjecao: "" },
    );
  }

  return spec;
}

export interface ValidationResult {
  ok: boolean;
  spec: TreinamentoSpec | null;
  /** Problemas que impedem publicar (schema quebrado). */
  fatal: string[];
  /** Problemas de qualidade, nao bloqueiam. */
  warnings: string[];
}

export function validate(candidate: unknown, b: Business): ValidationResult {
  const fatal: string[] = [];
  const warnings: string[] = [];

  const parsed = treinamentoSpecSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 12)) {
      fatal.push(`${issue.path.join(".") || "raiz"}: ${issue.message}`);
    }
    return { ok: false, spec: null, fatal, warnings };
  }

  const spec = parsed.data;

  for (const value of textValues(spec)) {
    const hit = PLACEHOLDER_PATTERNS.find((p) => p.test(value));
    if (hit) warnings.push(`Placeholder no texto: "${value.slice(0, 60)}"`);
  }

  if (!spec.etapa1.dores.length) warnings.push("Nenhuma dor identificada na etapa 1.");
  if (!spec.etapa2.indicadores.length) warnings.push("Nenhum indicador na etapa 2 (tempo de tela / taxa de conversão).");
  if (!spec.etapa3.roleplayWhatsapp.length) warnings.push("Nenhum cenário de roleplay de WhatsApp gerado.");
  if (!spec.etapa3.roleplayLigacao.length) warnings.push("Nenhum cenário de simulação de ligação gerado.");
  for (const c of spec.etapa3.roleplayWhatsapp) {
    if (c.mensagens.length < 4) warnings.push(`Cenário de WhatsApp "${c.titulo}" tem poucas mensagens.`);
  }
  if (!spec.materialApoio.scriptLigacao.abertura || !spec.materialApoio.scriptLigacao.fechamento) {
    warnings.push("Script de ligação do material de apoio está incompleto.");
  }
  if (spec.materialApoio.cronogramaFollowup.length < 3) {
    warnings.push("Cronograma de follow-up com poucas etapas.");
  }

  return { ok: true, spec, fatal, warnings };
}
