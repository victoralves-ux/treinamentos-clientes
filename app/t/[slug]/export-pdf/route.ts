import { NextResponse } from "next/server";
import { exportTreinamentoPdf } from "@/lib/pdf";
import { getPublishedTreinamento } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Publico: /t/[slug] nao exige login. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const treinamento = await getPublishedTreinamento(slug);
    if (!treinamento?.spec) return NextResponse.json({ error: "Treinamento não encontrado" }, { status: 404 });

    const buffer = await exportTreinamentoPdf(treinamento.spec);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${slug}-manual.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao exportar o manual." },
      { status: 500 },
    );
  }
}
