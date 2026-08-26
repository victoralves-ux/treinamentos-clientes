import { buildTreinamento } from "@/lib/pipeline";
import { getTreinamentoAdmin, updateTreinamentoAdmin } from "@/lib/repo";
import { planSchema } from "@/lib/schema";
import { authorizeTreinamento, sseStream } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Etapa 2: escreve o conteudo, valida, corrige e publica. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeTreinamento(id);
  if ("error" in auth) return auth.error;

  // O plano vem do navegador; se nao vier, usamos o que a etapa 1 gravou.
  const body = (await req.json().catch(() => ({}))) as { plan?: unknown };
  const salvo = (auth.treinamento.business as Record<string, unknown>)?.__plan;
  const plan = planSchema.safeParse(body.plan ?? salvo);

  if (!plan.success) {
    return new Response("Plano ausente ou inválido. Gere o treinamento novamente desde o início.", { status: 400 });
  }

  return sseStream(id, async (emit, send) => {
    try {
      await updateTreinamentoAdmin(id, { status: "gerando", error: null });
      await buildTreinamento(id, auth.business, plan.data, emit);
      const saved = await getTreinamentoAdmin(id);
      send({
        type: "done",
        slug: saved?.slug ?? auth.treinamento.slug,
        url: `/t/${saved?.slug ?? auth.treinamento.slug}`,
        warnings: saved?.issues ?? [],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updateTreinamentoAdmin(id, { status: "erro", error: message });
      throw err;
    }
  });
}
