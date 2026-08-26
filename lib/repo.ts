import "server-only";
import { supabaseAdmin, supabaseServer } from "./supabase/server";
import type { Business, TreinamentoSpec } from "./schema";

export type TreinamentoStatus = "rascunho" | "gerando" | "pronto" | "erro";

export const STATUS_LABEL: Record<TreinamentoStatus, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "#9aa4b6" },
  gerando: { label: "Gerando", color: "#f0b429" },
  pronto: { label: "Pronto", color: "#e0263f" },
  erro: { label: "Erro", color: "#ff6b6b" },
};

export interface TreinamentoRow {
  id: string;
  client_id: string | null;
  consultant_id: string;
  slug: string;
  status: TreinamentoStatus;
  client_name: string;
  business: Business;
  spec: TreinamentoSpec | null;
  issues: string[];
  error: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { name: string; email: string } | null;
}

/* ------------------------------- slug ------------------------------------ */

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(new RegExp(String.raw`[̀-ͯ]`, "g"), "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function uniqueSlug(base: string) {
  const admin = supabaseAdmin();
  const root = slugify(base) || "treinamento";
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await admin.from("treinamentos").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

/* ------------------------- leitura com escopo do usuario ------------------ */

export interface TreinamentoFilters {
  q?: string;
  status?: string;
  sort?: "recentes" | "antigos" | "az" | "za";
}

export async function listTreinamentos(filters: TreinamentoFilters = {}) {
  const sb = await supabaseServer();
  let query = sb.from("treinamentos").select("*, profiles:consultant_id (name, email)");

  if (filters.q) query = query.ilike("client_name", `%${filters.q}%`);
  if (filters.status && filters.status !== "todos") query = query.eq("status", filters.status);

  switch (filters.sort) {
    case "antigos":
      query = query.order("created_at", { ascending: true });
      break;
    case "az":
      query = query.order("client_name", { ascending: true });
      break;
    case "za":
      query = query.order("client_name", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as TreinamentoRow[];
}

export async function getTreinamento(id: string) {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("treinamentos")
    .select("*, profiles:consultant_id (name, email)")
    .eq("id", id)
    .maybeSingle();
  return (data as TreinamentoRow) ?? null;
}

/** Pagina publica: sem usuario logado, le com service role. */
export async function getPublishedTreinamento(slug: string) {
  const { data } = await supabaseAdmin().from("treinamentos").select("*").eq("slug", slug).maybeSingle();
  const row = data as TreinamentoRow | null;
  if (!row || !row.spec) return null;
  if (row.status !== "pronto") return null;
  return row;
}

/* ------------------------------- escrita --------------------------------- */

export async function createTreinamento(input: { consultantId: string; business: Business }) {
  const sb = await supabaseServer();

  const { data: client } = await sb
    .from("clients")
    .insert({
      consultant_id: input.consultantId,
      name: input.business.cliente,
      segmento: input.business.segmento ?? "",
    })
    .select()
    .single();

  const { data, error } = await sb
    .from("treinamentos")
    .insert({
      client_id: client?.id ?? null,
      consultant_id: input.consultantId,
      slug: await uniqueSlug(input.business.cliente || "treinamento"),
      status: "rascunho",
      client_name: input.business.cliente,
      business: input.business,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TreinamentoRow;
}

/** Usado pelo pipeline, que roda sem contexto de request do usuario. */
export async function updateTreinamentoAdmin(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin().from("treinamentos").update(patch).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as TreinamentoRow;
}

export async function getTreinamentoAdmin(id: string) {
  const { data } = await supabaseAdmin().from("treinamentos").select("*").eq("id", id).maybeSingle();
  return (data as TreinamentoRow) ?? null;
}

export async function deleteTreinamento(id: string) {
  const sb = await supabaseServer();
  const { error } = await sb.from("treinamentos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
