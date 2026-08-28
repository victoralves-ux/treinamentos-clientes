import { NextResponse } from "next/server";
import { treinamentoSpecSchema } from "@/lib/schema";
import { updateTreinamentoSpec } from "@/lib/repo";
import { currentProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Salva edicoes feitas pelo consultor no editor (texto e reordenacao de
 * itens). RLS garante que so o consultor dono do treinamento (ou admin)
 * consegue atualizar — ver policy treinamentos_all em supabase/schema.sql.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = treinamentoSpecSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Conteúdo inválido: ${parsed.error.issues[0]?.message ?? "formato inesperado"}` },
      { status: 400 },
    );
  }

  try {
    await updateTreinamentoSpec(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar as alterações." },
      { status: 500 },
    );
  }
}
