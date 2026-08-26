import { NextResponse } from "next/server";
import { exportTreinamentoPptx } from "@/lib/pptx";
import { getPublishedTreinamento } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Exportacao publica: a apresentacao publicada em /t/[slug] nao exige login
 * (e apresentada ao vivo para o time do cliente), entao o download tambem
 * fica publico — o slug ja funciona como o link de acesso.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const treinamento = await getPublishedTreinamento(slug);
    if (!treinamento?.spec) return NextResponse.json({ error: "Treinamento não encontrado" }, { status: 404 });

    const buffer = await exportTreinamentoPptx(treinamento.spec);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "content-disposition": `attachment; filename="${slug}.pptx"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao exportar a apresentação." },
      { status: 500 },
    );
  }
}
