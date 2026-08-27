import { buildConteudo1 } from "@/lib/pipeline";
import { updateTreinamentoAdmin } from "@/lib/repo";
import { planSchema } from "@/lib/schema";
import { authorizeTreinamento, sseStream } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Etapa 2: escreve as etapas 1, 2 e o material de apoio. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeTreinamento(id);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
  const salvo = (auth.treinamento.business as Record<string, unknown>)?.__plan;
  const plan = planSchema.safeParse(body.plan ?? salvo);

  if (!plan.success) {
    return new Response("Plano ausente ou inválido. Gere o treinamento novamente desde o início.", { status: 400 });
  }

  return sseStream(id, async (emit, send) => {
    try {
      await updateTreinamentoAdmin(id, { status: "gerando", error: null });
      const parcial = await buildConteudo1(auth.business, plan.data, emit);

      // Guarda o parcial pra retomar a etapa 3 mesmo se o navegador fechar
      // entre as duas chamadas — mesmo padrao usado para o plano.
      await updateTreinamentoAdmin(id, {
        business: { ...auth.treinamento.business, __plan: plan.data, __parcial: parcial },
      });

      send({ type: "conteudo1", plan: plan.data, parcial });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updateTreinamentoAdmin(id, { status: "erro", error: message });
      throw err;
    }
  });
}
