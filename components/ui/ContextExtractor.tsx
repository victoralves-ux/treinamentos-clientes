"use client";

import { useRef, useState } from "react";
import type { ClientContext } from "@/lib/context";
import { PROMPT_CONSULTOR } from "@/lib/prompt-consultor";

const FORMATOS = ".txt,.md,.docx,.rtf";
const LIMITE_ANALISE = 24_000;

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
        Não tem o documento ainda? Veja como preparar
      </summary>

      <div className="border-t px-4 py-4" style={{ borderColor: "var(--app-border)" }}>
        <ol className="grid gap-2 text-xs leading-relaxed" style={{ color: "var(--app-muted)" }}>
          <li>1. Copie o prompt abaixo e cole no Project do Claude deste cliente (o que já tem atas, protocolos e dados).</li>
          <li>2. Deixe o Claude responder usando o que já está no Project.</li>
          <li>3. Revise a resposta e complete o que faltar.</li>
          <li>4. Salve como .txt e envie aqui.</li>
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
          O prompt já instrui o Claude a não inventar informação e a preservar trechos reais de conversa, que são a base do roleplay.
        </p>
      </div>
    </details>
  );
}

/**
 * Upload do material bruto do cliente. A IA le, organiza em briefing
 * estruturado e preenche o formulario.
 */
export function ContextExtractor({
  onExtract,
}: {
  onExtract: (ctx: ClientContext) => { preenchidos: string[] };
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    preenchidos: string[];
    ctx: ClientContext;
    arquivo: string;
    caracteres: number;
    truncado: boolean;
  } | null>(null);

  async function enviar(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setResultado(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/context", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na análise");
      const { preenchidos } = onExtract(data.context as ClientContext);
      setResultado({
        preenchidos,
        ctx: data.context as ClientContext,
        arquivo: data.arquivo,
        caracteres: data.caracteres,
        truncado: data.truncado,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na análise");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const ctx = resultado?.ctx;
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

  return (
    <div className="grid gap-4">
      <ComoPreparar />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!busy) void enviar(e.dataTransfer.files);
        }}
        onClick={() => !busy && input.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-1 px-4 py-9 text-center transition-colors"
        style={{
          background: over ? "rgba(224,38,63,0.08)" : "var(--app-panel-2)",
          border: `1px dashed ${over ? "var(--app-accent)" : "var(--app-border)"}`,
          borderRadius: "10px",
        }}
      >
        <p className="text-sm font-medium">{busy ? "Lendo e analisando…" : "Arraste o documento aqui"}</p>
        <p className="text-xs" style={{ color: "var(--app-muted)" }}>
          ou clique para selecionar · .docx, .txt, .md ou .rtf até 5 MB
        </p>
        <input
          ref={input}
          type="file"
          accept={FORMATOS}
          hidden
          onChange={(e) => void enviar(e.target.files)}
        />
      </div>

      {error ? (
        <p className="text-sm" style={{ color: "#ff6b6b" }}>
          {error}
        </p>
      ) : null}

      {resultado ? (
        <div
          className="p-4 text-sm"
          style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}
        >
          <p className="font-semibold" style={{ color: "var(--app-accent-2)" }}>
            {resultado.arquivo} analisado
          </p>

          {resultado.truncado ? (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: "#f0b429" }}>
              O documento tem {resultado.caracteres.toLocaleString("pt-BR")} caracteres e só os primeiros{" "}
              {LIMITE_ANALISE.toLocaleString("pt-BR")} foram analisados. Se as informações importantes estiverem no
              fim, envie um arquivo menor com o resumo.
            </p>
          ) : null}

          <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--app-muted)" }}>
            {resultado.preenchidos.length
              ? `Campos preenchidos: ${resultado.preenchidos.join(", ")}.`
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
