import { NextResponse } from "next/server";
import { exportTreinamentoPptx } from "@/lib/pptx";
import { getTreinamentoAdmin } from "@/lib/repo";
import { currentProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Exporta a apresentacao pronta para .pptx — editavel na hora, arquivo leve. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const treinamento = await getTreinamentoAdmin(id);
    if (!treinamento?.spec) return NextResponse.json({ error: "Treinamento ainda não foi gerado" }, { status: 404 });

    const buffer = await exportTreinamentoPptx(treinamento.spec);
    const nomeArquivo = `${treinamento.slug}.pptx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "content-disposition": `attachment; filename="${nomeArquivo}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao exportar a apresentação." },
      { status: 500 },
    );
  }
}
