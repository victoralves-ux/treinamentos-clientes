import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import { TreinamentoEditor } from "@/components/treinamento/TreinamentoEditor";
import { getTreinamento } from "@/lib/repo";
import { currentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EditarTreinamento({ params }: { params: Promise<{ id: string }> }) {
  const profile = await currentProfile();
  if (!profile) redirect("/login");

  const { id } = await params;
  const treinamento = await getTreinamento(id);
  if (!treinamento?.spec) notFound();

  return (
    <AppShell profile={profile}>
      <TreinamentoEditor id={treinamento.id} slug={treinamento.slug} initialSpec={treinamento.spec} />
    </AppShell>
  );
}
