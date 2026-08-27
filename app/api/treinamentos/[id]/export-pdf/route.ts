import { NextResponse } from "next/server";
import { exportTreinamentoPdf } from "@/lib/pdf";
import { getTreinamentoAdmin } from "@/lib/repo";
import { currentProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Exporta o manual de bolso em PDF — editavel na apresentacao, so leitura aqui. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  try {
    const treinamento = await getTreinamentoAdmin(id);
    if (!treinamento?.spec) return NextResponse.json({ error: "Treinamento ainda não foi gerado" }, { status: 404 });

    const buffer = await exportTreinamentoPdf(treinamento.spec);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${treinamento.slug}-manual.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao exportar o manual." },
      { status: 500 },
    );
  }
}
