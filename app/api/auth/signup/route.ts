import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cadastro restrito por dominio de e-mail. O Supabase nao tem allowlist
 * nativa, entao o cadastro passa por aqui: validamos o dominio e criamos o
 * usuario ja confirmado com service role. O signup publico do Supabase deve
 * ficar desligado no painel para que este seja o unico caminho.
 */
const ALLOWED = (process.env.ALLOWED_EMAIL_DOMAINS || "usepulso.org")
  .split(",")
  .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean);

export async function POST(req: Request) {
  const { email, password, name } = (await req.json().catch(() => ({}))) as Record<string, string>;

  const cleanEmail = (email ?? "").trim().toLowerCase();
  const domain = cleanEmail.split("@")[1] ?? "";

  if (!cleanEmail || !domain) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (!ALLOWED.includes(domain)) {
    return NextResponse.json(
      { error: `Cadastro permitido apenas para e-mails @${ALLOWED.join(", @")}.` },
      { status: 403 },
    );
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "A senha precisa ter ao menos 8 caracteres." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: { name: name?.trim() || cleanEmail.split("@")[0] },
  });

  if (error) {
    const jaExiste = /already|registered|exists/i.test(error.message);
    return NextResponse.json(
      {
        error: jaExiste
          ? "Este e-mail já possui conta. Faça login ou peça a redefinição da senha ao administrador."
          : error.message,
      },
      { status: jaExiste ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
