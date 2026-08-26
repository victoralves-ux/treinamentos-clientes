import { NextResponse } from "next/server";
import { createTreinamento, listTreinamentos } from "@/lib/repo";
import { businessSchema } from "@/lib/schema";
import { currentProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const treinamentos = await listTreinamentos({
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return NextResponse.json(treinamentos);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao listar treinamentos." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const parsed = businessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 },
    );
  }

  try {
    const treinamento = await createTreinamento({ consultantId: profile.id, business: parsed.data });
    return NextResponse.json({ id: treinamento.id, slug: treinamento.slug });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar o treinamento." },
      { status: 500 },
    );
  }
}
