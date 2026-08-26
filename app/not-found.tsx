import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-display text-5xl font-semibold">404</p>
      <p style={{ color: "var(--app-muted)" }}>Esta página não existe ou o treinamento ainda não foi publicado.</p>
      <Link href="/" className="text-sm font-semibold" style={{ color: "var(--app-accent)" }}>
        Voltar ao painel
      </Link>
    </div>
  );
}
