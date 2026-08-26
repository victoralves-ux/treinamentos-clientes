"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Troca da propria senha, sem depender de e-mail nem de administrador. */
export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<{ error?: string; ok?: boolean }>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({});
    if (password.length < 8) return setState({ error: "Use ao menos 8 caracteres." });
    if (password !== confirm) return setState({ error: "As senhas não coincidem." });

    setSaving(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setSaving(false);
    if (error) return setState({ error: error.message });
    setState({ ok: true });
    setPassword("");
    setConfirm("");
    setTimeout(() => setOpen(false), 1500);
  }

  return (
    <>
      <button
        type="button"
        title="Trocar senha"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center"
        style={{ border: "1px solid var(--app-border)", borderRadius: "9px", color: "var(--app-muted)" }}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm p-7"
            style={{ background: "var(--app-panel)", border: "1px solid var(--app-border)", borderRadius: "16px" }}
          >
            <h2 className="text-lg font-semibold">Trocar senha</h2>
            <div className="mt-5 grid gap-4">
              <div>
                <label className="label">Nova senha</label>
                <input
                  className="field"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Repita a nova senha</label>
                <input
                  className="field"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {state.error ? (
                <p className="text-sm" style={{ color: "#ff6b6b" }}>
                  {state.error}
                </p>
              ) : null}
              {state.ok ? (
                <p className="text-sm" style={{ color: "var(--app-accent-2)" }}>
                  Senha alterada.
                </p>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-5 py-2.5 text-sm font-bold disabled:opacity-60"
                  style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "10px" }}
                >
                  {saving ? "Salvando…" : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-5 py-2.5 text-sm"
                  style={{ border: "1px solid var(--app-border)", borderRadius: "10px", color: "var(--app-muted)" }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
