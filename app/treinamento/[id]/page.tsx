import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/ui/AppShell";
import { GenerateView } from "@/components/ui/GenerateView";
import { getTreinamento } from "@/lib/repo";
import { currentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TreinamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gerar?: string }>;
}) {
  const profile = await currentProfile();
  if (!profile) redirect("/login");

  const { id } = await params;
  const { gerar } = await searchParams;
  const treinamento = await getTreinamento(id);
  if (!treinamento) notFound();

  return (
    <AppShell profile={profile}>
      <GenerateView
        id={treinamento.id}
        name={treinamento.client_name || treinamento.business?.cliente || "Treinamento"}
        slug={treinamento.slug}
        initialStatus={treinamento.status}
        initialWarnings={treinamento.issues ?? []}
        initialError={treinamento.error}
        autostart={gerar === "1"}
      />
    </AppShell>
  );
}
