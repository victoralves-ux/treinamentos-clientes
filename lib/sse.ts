import { getTreinamentoAdmin, updateTreinamentoAdmin } from "./repo";
import { businessSchema, type Business } from "./schema";
import { currentProfile } from "./supabase/server";
import type { Emit } from "./pipeline";

export const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-accel-buffering": "no",
};

/**
 * A Vercel encerra a funcao aos 60s sem executar catch nem finally. Se isso
 * acontecesse no meio da geracao, o treinamento ficava com status "gerando"
 * para sempre e o navegador girava sem nunca receber erro. O cao de guarda
 * dispara antes disso, grava a falha e avisa o cliente.
 *
 * Precisa ficar ACIMA do orcamento que lib/ai.ts da para a chamada da
 * Anthropic (ANTHROPIC_BUDGET_MS) — senao o cao de guarda derruba a geracao
 * antes da logica de retry ali dentro ter chance de agir, e o consultor so
 * ve a mensagem generica em vez da mensagem especifica de timeout da IA.
 */
const WATCHDOG_MS = 57_000;

export async function authorizeTreinamento(id: string) {
  const profile = await currentProfile();
  if (!profile) return { error: new Response("Não autenticado", { status: 401 }) } as const;

  const treinamento = await getTreinamentoAdmin(id);
  if (!treinamento) return { error: new Response("Treinamento não encontrado", { status: 404 }) } as const;
  if (treinamento.consultant_id !== profile.id && profile.role !== "admin") {
    return { error: new Response("Sem permissão para gerar este treinamento", { status: 403 }) } as const;
  }

  return { treinamento, business: businessSchema.parse(treinamento.business) } as const;
}

/** Executa uma etapa transmitindo o progresso por Server-Sent Events. */
export function sseStream(
  treinamentoId: string,
  run: (emit: Emit, send: (payload: unknown) => void) => Promise<void>,
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fechado = false;
      const send = (payload: unknown) => {
        if (fechado) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          fechado = true;
        }
      };

      const watchdog = setTimeout(async () => {
        const message =
          "A geração passou do tempo limite do servidor (60s). Isso costuma ser lentidão temporária do modelo de IA — tente gerar novamente.";
        send({ type: "error", message });
        fechado = true;
        try {
          await updateTreinamentoAdmin(treinamentoId, { status: "erro", error: message });
        } catch {
          /* nada a fazer: a funcao esta prestes a ser encerrada */
        }
        try {
          controller.close();
        } catch {
          /* ja fechado */
        }
      }, WATCHDOG_MS);

      try {
        await run((e) => send({ type: "step", ...e }), send);
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        clearTimeout(watchdog);
        if (!fechado) {
          fechado = true;
          try {
            controller.close();
          } catch {
            /* ja fechado */
          }
        }
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

export type { Business };
