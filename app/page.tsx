import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, Panel } from "@/components/ui/AppShell";
import { Filters } from "@/components/ui/Filters";
import { TreinamentoCard } from "@/components/ui/TreinamentoCard";
import { activeProvider } from "@/lib/ai";
import { STATUS_LABEL, listTreinamentos, type TreinamentoStatus } from "@/lib/repo";
import { currentProfile, supabaseConfigured } from "@/lib/supabase/server";
import { SetupNeeded } from "@/components/ui/SetupNeeded";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!supabaseConfigured()) return <SetupNeeded />;

  const profile = await currentProfile();
  if (!profile) redirect("/login");

  const sp = await searchParams;

  const treinamentos = await listTreinamentos({
    q: sp.q,
    status: sp.status,
    sort: (sp.ordem as "recentes" | "antigos" | "az" | "za") ?? "recentes",
  });

  const provider = activeProvider();

  return (
    <AppShell profile={profile}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Meus treinamentos</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--app-muted)" }}>
            {profile.role === "admin" ? "Visão de administrador: todos os consultores. " : ""}
            {treinamentos.length} treinamento(s) encontrado(s).
          </p>
        </div>
      </div>

      {!provider ? (
        <Panel className="mb-6">
          <p className="text-sm font-semibold" style={{ color: "#f0b429" }}>
            Chave de IA não configurada
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--app-muted)" }}>
            Defina <code>ANTHROPIC_API_KEY</code> ou <code>GEMINI_API_KEY</code> nas variáveis de ambiente.
          </p>
        </Panel>
      ) : null}

      <Filters />

      {treinamentos.length === 0 ? (
        <Panel className="text-center">
          <p className="text-lg font-semibold">Nenhum treinamento encontrado</p>
          <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--app-muted)" }}>
            Ajuste os filtros ou crie o treinamento do próximo cliente.
          </p>
          <Link
            href="/novo"
            className="mt-6 inline-block px-5 py-2.5 text-sm font-semibold"
            style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "10px" }}
          >
            Criar novo treinamento
          </Link>
        </Panel>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {treinamentos.map((t) => {
            // Uma geracao leva menos de um minuto. Passou disso em "gerando",
            // a tentativa morreu no meio e precisa ser refeita.
            const travado = t.status === "gerando" && Date.now() - new Date(t.updated_at).getTime() > 3 * 60_000;
            const st = travado
              ? { label: "Interrompido", color: "#ff6b6b" }
              : (STATUS_LABEL[t.status as TreinamentoStatus] ?? STATUS_LABEL.rascunho);
            return (
              <TreinamentoCard
                key={t.id}
                treinamento={{
                  id: t.id,
                  slug: t.slug,
                  status: t.status,
                  statusLabel: st.label,
                  statusColor: st.color,
                  clientName: t.client_name || t.business?.cliente || "Sem nome",
                  segmento: t.business?.segmento ?? "",
                  consultant: t.profiles?.name || t.profiles?.email || "—",
                  createdAt: t.created_at,
                }}
              />
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
