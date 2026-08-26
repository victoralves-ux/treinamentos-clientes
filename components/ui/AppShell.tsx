import Link from "next/link";
import type { ReactNode } from "react";
import { ChangePassword } from "./ChangePassword";
import { SignOutButton } from "./SignOutButton";

export function AppShell({
  children,
  profile,
}: {
  children: ReactNode;
  profile?: { name: string; email: string; role: string } | null;
}) {
  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{ background: "rgba(10,10,10,0.85)", borderBottom: "1px solid var(--app-border)" }}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center text-sm font-bold"
              style={{ background: "var(--app-accent)", borderRadius: "9px", color: "#0a0a0a" }}
            >
              P
            </span>
            <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">Treinamentos Clientes</span>
          </Link>

          <div className="flex items-center gap-3">
            {profile ? (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight">{profile.name}</p>
                <p className="text-xs leading-tight" style={{ color: "var(--app-muted)" }}>
                  {profile.role === "admin" ? "Administrador" : "Consultor"}
                </p>
              </div>
            ) : null}
            <Link
              href="/novo"
              className="px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "9px" }}
            >
              + Novo treinamento
            </Link>
            {profile ? <ChangePassword /> : null}
            {profile ? <SignOutButton /> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-5 py-10">{children}</main>
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`p-6 ${className}`}
      style={{ background: "var(--app-panel)", border: "1px solid var(--app-border)", borderRadius: "14px" }}
    >
      {children}
    </div>
  );
}
