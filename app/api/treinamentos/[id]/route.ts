import { NextResponse } from "next/server";
import { deleteTreinamento, getTreinamento } from "@/lib/repo";
import { currentProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const treinamento = await getTreinamento(id);
  if (!treinamento) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(treinamento);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  await deleteTreinamento(id);
  return NextResponse.json({ ok: true });
}
