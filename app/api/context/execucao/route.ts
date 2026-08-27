import { NextResponse } from "next/server";
import { generateJson } from "@/lib/ai";
import { contextPromptExecucao, contextSchemaExecucao } from "@/lib/context";
import { extrairTexto, TAMANHO_MAXIMO } from "@/lib/extrair-texto";
import { currentProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Le o arquivo 2 (execucao e exemplos) e devolve so essa fatia do briefing.
 * Ver lib/context.ts para o porque de duas chamadas separadas em vez de uma.
 */
export async function POST(req: Request) {
  const profile = await currentProfile();
  if (!profile) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  if (file.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ error: "Arquivo maior que 5 MB." }, { status: 400 });
  }

  let extraido;
  try {
    extraido = await extrairTexto(file);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Não foi possível ler o arquivo." },
      { status: 400 },
    );
  }

  if (extraido.texto.trim().length < 40) {
    return NextResponse.json({ error: "O arquivo não tem texto suficiente para analisar." }, { status: 400 });
  }

  try {
    const prompts = contextPromptExecucao(extraido.texto);
    const bruto = await generateJson(prompts.system, prompts.user, 5000, "conteudo", 58_000);
    const parsed = contextSchemaExecucao.safeParse(bruto);
    if (!parsed.success) {
      return NextResponse.json({ error: "Não foi possível estruturar o material. Tente novamente." }, { status: 502 });
    }
    return NextResponse.json({
      context: parsed.data,
      arquivo: file.name,
      caracteres: extraido.caracteres,
      truncado: extraido.truncado,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao analisar o material." },
      { status: 500 },
    );
  }
}
