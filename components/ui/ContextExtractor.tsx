"use client";

import { useRef, useState } from "react";
import type { z } from "zod";
import {
  contextSchemaDiagnostico,
  contextSchemaExecucao,
  mergeContext,
  type ClientContext,
} from "@/lib/context";
import { PROMPT_CONSULTOR } from "@/lib/prompt-consultor";

const FORMATOS = ".txt,.md,.docx,.rtf";
const LIMITE_ANALISE = 24_000;

type Parte = "diagnostico" | "execucao";
const ROTULO_PARTE: Record<Parte, string> = { diagnostico: "arquivo 1 (diagnóstico)", execucao: "arquivo 2 (execução)" };

type ResultadoParte = { arquivo: string; caracteres: number; truncado: boolean };

/**
 * Instrucoes para o consultor gerar o material no Project do Claude que ja
 * tem tudo sobre o cliente. O prompt fica pronto para copiar ou baixar.
 */
function ComoPreparar() {
  const [copiado, setCopiado] = useState(false);

  function baixar() {
    const url = URL.createObjectURL(new Blob([PROMPT_CONSULTOR], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompt-briefing-treinamento.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <details style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}>
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        Não tem os documentos ainda? Veja como preparar
      </summary>

      <div className="border-t px-4 py-4" style={{ borderColor: "var(--app-border)" }}>
        <ol className="grid gap-2 text-xs leading-relaxed" style={{ color: "var(--app-muted)" }}>
          <li>1. Copie o prompt abaixo e cole no Project do Claude deste cliente (o que já tem atas, protocolos e dados).</li>
          <li>2. O Claude gera direto DOIS arquivos .txt para download — não precisa colar nada na conversa.</li>
          <li>3. Baixe os dois e revise rapidamente o conteúdo.</li>
          <li>4. Suba o arquivo 1 no campo &quot;Diagnóstico&quot; e o arquivo 2 no campo &quot;Execução e exemplos&quot; abaixo.</li>
        </ol>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(PROMPT_CONSULTOR);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
            className="px-4 py-2 text-xs font-semibold"
            style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "8px" }}
          >
            {copiado ? "Prompt copiado" : "Copiar prompt"}
          </button>
          <button
            type="button"
            onClick={baixar}
            className="px-4 py-2 text-xs font-semibold"
            style={{ border: "1px solid var(--app-border)", borderRadius: "8px" }}
          >
            Baixar como .txt
          </button>
        </div>

        <p className="mt-3 text-xs" style={{ color: "var(--app-muted)" }}>
          O prompt já instrui o Claude a não inventar informação, a preservar trechos reais de conversa (base do
          roleplay) e a gerar os arquivos direto, sem gastar tokens reescrevendo tudo na conversa.
        </p>
      </div>
    </details>
  );
}

function ArquivoSlot({
  titulo,
  descricao,
  file,
  busy,
  disabled,
  resultado,
  onSelect,
}: {
  titulo: string;
  descricao: string;
  file: File | null;
  busy: boolean;
  disabled: boolean;
  resultado: ResultadoParte | null;
  onSelect: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f && !disabled) onSelect(f);
      }}
      onClick={() => !disabled && input.current?.click()}
      className="flex cursor-pointer flex-col items-center justify-center gap-1 px-4 py-7 text-center transition-colors"
      style={{
        background: over ? "rgba(224,38,63,0.08)" : "var(--app-panel-2)",
        border: `1px dashed ${over ? "var(--app-accent)" : "var(--app-border)"}`,
        borderRadius: "10px",
        opacity: disabled && !busy ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <p className="text-sm font-semibold">{titulo}</p>
      <p className="text-xs" style={{ color: "var(--app-muted)" }}>
        {descricao}
      </p>
      <p className="mt-2 text-xs font-medium" style={{ color: busy ? "var(--app-accent)" : file ? "var(--app-accent-2)" : "var(--app-muted)" }}>
        {busy
          ? "Analisando…"
          : resultado
            ? `${resultado.arquivo} analisado`
            : file
              ? file.name
              : "Arraste ou clique para selecionar"}
      </p>
      <input
        ref={input}
        type="file"
        accept={FORMATOS}
        hidden
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/**
 * Upload do material bruto do cliente, em dois arquivos (diagnostico e
 * execucao — ver lib/prompt-consultor.ts). Analisa um de cada vez, em
 * sequencia, para nao sobrecarregar: cada arquivo e uma chamada de IA
 * separada, dentro do teto de tempo da funcao serverless.
 */
export function ContextExtractor({
  onExtract,
}: {
  onExtract: (ctx: ClientContext) => { preenchidos: string[] };
}) {
  const [arquivos, setArquivos] = useState<{ diagnostico: File | null; execucao: File | null }>({
    diagnostico: null,
    execucao: null,
  });
  const [busy, setBusy] = useState<Parte | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Record<Parte, ResultadoParte | null>>({
    diagnostico: null,
    execucao: null,
  });
  const [resumo, setResumo] = useState<{ preenchidos: string[]; ctx: ClientContext } | null>(null);

  const diagnosticoRef = useRef<z.infer<typeof contextSchemaDiagnostico> | null>(null);
  const execucaoRef = useRef<z.infer<typeof contextSchemaExecucao> | null>(null);

  async function analisarParte(parte: Parte, file: File) {
    setBusy(parte);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/context/${parte}`, { method: "POST", body });
    const data = await res.json();
    if (!res.ok) throw new Error(`Falha ao analisar ${ROTULO_PARTE[parte]}: ${data.error ?? "erro desconhecido"}`);
    if (parte === "diagnostico") diagnosticoRef.current = data.context;
    else execucaoRef.current = data.context;
    setResultados((r) => ({ ...r, [parte]: { arquivo: data.arquivo, caracteres: data.caracteres, truncado: data.truncado } }));
  }

  async function analisarTudo() {
    setError(null);
    setResumo(null);
    try {
      // Sequencial de proposito: um arquivo termina antes do proximo comecar.
      if (arquivos.diagnostico) await analisarParte("diagnostico", arquivos.diagnostico);
      if (arquivos.execucao) await analisarParte("execucao", arquivos.execucao);

      const ctx = mergeContext(diagnosticoRef.current, execucaoRef.current);
      const { preenchidos } = onExtract(ctx);
      setResumo({ preenchidos, ctx });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na análise");
    } finally {
      setBusy(null);
    }
  }

  const ctx = resumo?.ctx;
  const encontrados = ctx
    ? ([
        ["dores", ctx.dores?.length ?? 0],
        ["estratégias executadas", ctx.estrategias_executadas?.length ?? 0],
        ["métricas", ctx.metricas?.length ?? 0],
        ["exemplos de WhatsApp", ctx.exemplos_whatsapp?.length ?? 0],
        ["exemplos de ligação", ctx.exemplos_ligacao?.length ?? 0],
        ["etapas de follow-up já usadas", ctx.cronograma_followup_atual?.length ?? 0],
      ].filter(([, n]) => (n as number) > 0) as [string, number][])
    : [];

  const truncados = (["diagnostico", "execucao"] as Parte[])
    .map((p) => resultados[p])
    .filter((r): r is ResultadoParte => Boolean(r?.truncado));

  return (
    <div className="grid gap-4">
      <ComoPreparar />

      <div className="grid gap-3 sm:grid-cols-2">
        <ArquivoSlot
          titulo="Arquivo 1 — Diagnóstico"
          descricao="Cliente, processo atual, dores, métricas."
          file={arquivos.diagnostico}
          busy={busy === "diagnostico"}
          disabled={busy !== null}
          resultado={resultados.diagnostico}
          onSelect={(f) => setArquivos((a) => ({ ...a, diagnostico: f }))}
        />
        <ArquivoSlot
          titulo="Arquivo 2 — Execução e exemplos"
          descricao="Estratégias já executadas, exemplos reais de conversa, script e cronograma."
          file={arquivos.execucao}
          busy={busy === "execucao"}
          disabled={busy !== null}
          resultado={resultados.execucao}
          onSelect={(f) => setArquivos((a) => ({ ...a, execucao: f }))}
        />
      </div>

      <button
        type="button"
        disabled={busy !== null || (!arquivos.diagnostico && !arquivos.execucao)}
        onClick={() => void analisarTudo()}
        className="px-5 py-2.5 text-sm font-bold disabled:opacity-50"
        style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "9px" }}
      >
        {busy ? `Analisando ${ROTULO_PARTE[busy]}…` : "Analisar arquivos"}
      </button>

      {error ? (
        <p className="text-sm" style={{ color: "#ff6b6b" }}>
          {error}
        </p>
      ) : null}

      {resumo ? (
        <div
          className="p-4 text-sm"
          style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}
        >
          <p className="font-semibold" style={{ color: "var(--app-accent-2)" }}>
            Material analisado
          </p>

          {truncados.length ? (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "#f0b429" }}>
              {truncados
                .map(
                  (r) =>
                    `${r.arquivo} tem ${r.caracteres.toLocaleString("pt-BR")} caracteres e só os primeiros ${LIMITE_ANALISE.toLocaleString("pt-BR")} foram analisados`,
                )
                .join("; ")}
              . Se faltou informação importante, divida esse arquivo em partes menores.
            </p>
          ) : null}

          <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--app-muted)" }}>
            {resumo.preenchidos.length
              ? `Campos preenchidos: ${resumo.preenchidos.join(", ")}.`
              : "Nenhum campo do formulário estava vazio — nada foi sobrescrito."}
          </p>

          {encontrados.length ? (
            <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--app-muted)" }}>
              Encontrados: {encontrados.map(([nome, n]) => `${n} ${nome}`).join(", ")}.
            </p>
          ) : null}

          <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--app-muted)" }}>
            Revise os campos abaixo antes de gerar. O briefing completo — incluindo exemplos reais de conversa —
            vai junto para a geração, mesmo o que não coube no formulário.
          </p>
        </div>
      ) : null}
    </div>
  );
}
