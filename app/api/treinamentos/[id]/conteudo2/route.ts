import { buildConteudo2, type ConteudoParcial } from "@/lib/pipeline";
import { getTreinamentoAdmin, updateTreinamentoAdmin } from "@/lib/repo";
import { planSchema } from "@/lib/schema";
import { authorizeTreinamento, sseStream } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Etapa 3: escreve o roleplay, valida, corrige e publica. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeTreinamento(id);
  if ("error" in auth) return auth.error;

  // Plano e parcial vem do navegador; se nao vierem, usamos o que a etapa
  // anterior gravou (permite retomar se o navegador fechou entre as chamadas).
  const body = (await req.json().catch(() => ({}))) as { plan?: unknown; parcial?: ConteudoParcial };
  const salvo = auth.treinamento.business as Record<string, unknown>;
  const plan = planSchema.safeParse(body.plan ?? salvo?.__plan);
  const parcial = (body.parcial ?? salvo?.__parcial) as ConteudoParcial | undefined;

  if (!plan.success || !parcial || typeof parcial !== "object") {
    return new Response("Conteúdo parcial ausente ou inválido. Gere o treinamento novamente desde o início.", {
      status: 400,
    });
  }

  return sseStream(id, async (emit, send) => {
    try {
      await updateTreinamentoAdmin(id, { status: "gerando", error: null });
      await buildConteudo2(id, auth.business, plan.data, parcial, emit);
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
