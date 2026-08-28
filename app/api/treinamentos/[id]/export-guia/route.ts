import { NextResponse } from "next/server";
import { gerarGuiaConsultor } from "@/lib/guia";
import { getTreinamentoAdmin } from "@/lib/repo";
import { currentProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Guia do consultor (.txt) — uso interno, por isso so a rota autenticada
 * existe (sem equivalente em /t/[slug], que e publica). Montado direto do
 * spec ja gerado, sem chamada de IA: instantaneo.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const treinamento = await getTreinamentoAdmin(id);
    if (!treinamento?.spec) return NextResponse.json({ error: "Treinamento ainda não foi gerado" }, { status: 404 });

    const texto = gerarGuiaConsultor(treinamento.spec);
    return new NextResponse(texto, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "content-disposition": `attachment; filename="${treinamento.slug}-guia-consultor.txt"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao gerar o guia." },
      { status: 500 },
    );
  }
}
