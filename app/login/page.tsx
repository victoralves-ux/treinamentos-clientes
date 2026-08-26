"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/";
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const sb = supabaseBrowser();

    if (mode === "criar") {
      // O cadastro passa pela nossa API, que so aceita dominios autorizados.
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar a conta.");
        setLoading(false);
        return;
      }
    }

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      setError(traduzir(error.message));
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div
        className="w-full max-w-sm p-8"
        style={{ background: "var(--app-panel)", border: "1px solid var(--app-border)", borderRadius: "16px" }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center text-sm font-bold"
            style={{ background: "var(--app-accent)", borderRadius: "10px", color: "#0a0a0a" }}
          >
            P
          </span>
          <span className="text-base font-semibold tracking-tight">Treinamentos Clientes</span>
        </div>

        <h1 className="mt-7 text-xl font-semibold">
          {mode === "entrar" ? "Entrar" : "Criar conta de consultor"}
        </h1>
        {mode === "criar" ? (
          <p className="mt-2 text-xs" style={{ color: "var(--app-muted)" }}>
            Cadastro permitido apenas para e-mails corporativos @usepulso.org.
          </p>
        ) : null}

        <form onSubmit={submit} className="mt-6 grid gap-4">
          {mode === "criar" ? (
            <div>
              <label className="label">Seu nome</label>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="João Silva" />
            </div>
          ) : null}
          <div>
            <label className="label">E-mail</label>
            <input
              className="field"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Senha</label>
            <input
              className="field"
              type="password"
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
              required
              minLength={mode === "criar" ? 8 : 6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? (
            <p className="text-sm" style={{ color: "#ff6b6b" }}>
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-sm" style={{ color: "var(--app-accent-2)" }}>
              {info}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 px-6 py-3 text-sm font-bold disabled:opacity-60"
            style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "10px" }}
          >
            {loading ? "Aguarde…" : mode === "entrar" ? "ENTRAR" : "CRIAR CONTA"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "entrar" ? "criar" : "entrar");
            setError(null);
          }}
          className="mt-5 w-full text-sm"
          style={{ color: "var(--app-muted)" }}
        >
          {mode === "entrar" ? "Não tenho conta — criar agora" : "Já tenho conta — entrar"}
        </button>
      </div>
    </div>
  );
}

function traduzir(message: string) {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/user already registered/i.test(message)) return "Este e-mail já possui conta.";
  if (/password should be at least/i.test(message)) return "A senha precisa ter ao menos 6 caracteres.";
  if (/email not confirmed/i.test(message)) return "Confirme o e-mail antes de entrar.";
  return message;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
