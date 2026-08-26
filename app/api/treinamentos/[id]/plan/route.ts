import { planTreinamento } from "@/lib/pipeline";
import { updateTreinamentoAdmin } from "@/lib/repo";
import { authorizeTreinamento, sseStream } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Etapa 1: analisa o briefing e planeja o escopo do treinamento. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeTreinamento(id);
  if ("error" in auth) return auth.error;

  return sseStream(id, async (emit, send) => {
    try {
      await updateTreinamentoAdmin(id, { status: "gerando", error: null });
      const plan = await planTreinamento(auth.business, emit);

      // O plano tambem fica guardado no banco: se o navegador fechar entre as
      // duas etapas, a construcao pode ser retomada sem replanejar.
      await updateTreinamentoAdmin(id, { business: { ...auth.treinamento.business, __plan: plan } });

      send({ type: "plan", plan });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await updateTreinamentoAdmin(id, { status: "erro", error: message });
      throw err;
    }
  });
}
