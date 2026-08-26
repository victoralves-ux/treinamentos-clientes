import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON);
}

/** Cliente que respeita RLS: enxerga apenas o que o usuario logado pode ver. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Component: o middleware ja cuida de renovar a sessao.
        }
      },
    },
  });
}

/**
 * Cliente com service role. Usado somente onde nao existe usuario logado:
 * a pagina publica do site e a gravacao feita pelo pipeline.
 * Nunca deve ser importado por codigo de cliente.
 */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

export async function currentProfile() {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
  return (
    data ?? {
      id: auth.user.id,
      name: auth.user.email?.split("@")[0] ?? "",
      email: auth.user.email ?? "",
      role: "consultant" as const,
      created_at: new Date().toISOString(),
    }
  );
}
