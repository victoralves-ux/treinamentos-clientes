import Link from "next/link";

export interface TreinamentoCardData {
  id: string;
  slug: string;
  status: string;
  statusLabel: string;
  statusColor: string;
  clientName: string;
  segmento: string;
  consultant: string;
  createdAt: string;
}

export function TreinamentoCard({ treinamento: t }: { treinamento: TreinamentoCardData }) {
  // Sempre leva para o painel do treinamento (não direto pra apresentação
  // publica): de la da pra abrir a apresentacao, editar, exportar etc.
  const href = `/treinamento/${t.id}`;
  return (
    <Link
      href={href}
      className="block p-5 transition-colors hover:opacity-90"
      style={{ background: "var(--app-panel)", border: "1px solid var(--app-border)", borderRadius: "14px" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-lg font-semibold leading-snug">{t.clientName}</p>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: `${t.statusColor}22`, color: t.statusColor }}
        >
          {t.statusLabel}
        </span>
      </div>
      {t.segmento ? (
        <p className="mt-1 text-sm" style={{ color: "var(--app-muted)" }}>
          {t.segmento}
        </p>
      ) : null}
      <div className="mt-4 flex items-center justify-between text-xs" style={{ color: "var(--app-muted)" }}>
        <span>{t.consultant}</span>
        <span>{new Date(t.createdAt).toLocaleDateString("pt-BR")}</span>
      </div>
    </Link>
  );
}
