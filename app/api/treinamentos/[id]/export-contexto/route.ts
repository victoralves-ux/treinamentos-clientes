import { NextResponse } from "next/server";
import { gerarResumoParaProjeto } from "@/lib/exportar-contexto";
import { getTreinamentoAdmin } from "@/lib/repo";
import { currentProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exporta o treinamento (com as edicoes do consultor, se houver) em .txt
 * pronto para colar/subir de volta no Project do Claude do cliente. Montado
 * direto do spec ja salvo, sem chamada de IA: instantaneo.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const treinamento = await getTreinamentoAdmin(id);
    if (!treinamento?.spec) return NextResponse.json({ error: "Treinamento ainda não foi gerado" }, { status: 404 });

    const texto = gerarResumoParaProjeto(treinamento.spec);
    return new NextResponse(texto, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="${treinamento.slug}-resumo-projeto.txt"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao gerar o resumo." },
      { status: 500 },
    );
  }
}
