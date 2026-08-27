"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { STEPS, type StepId } from "@/lib/steps";
import { Panel } from "./AppShell";

type State = "idle" | "running" | "done" | "error";
type StepState = { state: "pendente" | "running" | "done" | "error"; detail?: string };

export function GenerateView({
  id,
  name,
  slug,
  initialStatus,
  initialWarnings,
  initialError,
  autostart,
}: {
  id: string;
  name: string;
  slug: string;
  initialStatus: string;
  initialWarnings: string[];
  initialError: string | null;
  autostart: boolean;
}) {
  const pronto = initialStatus === "pronto";
  // "gerando" ao abrir a pagina significa que a tentativa anterior morreu no
  // meio (aba fechada, rede caida ou funcao encerrada pelo servidor).
  const interrompido = initialStatus === "gerando";
  const [state, setState] = useState<State>(
    pronto ? "done" : initialStatus === "erro" || interrompido ? "error" : "idle",
  );
  const [steps, setSteps] = useState<Record<string, StepState>>(
    pronto ? Object.fromEntries(STEPS.map((s) => [s.id, { state: "done" as const }])) : {},
  );
  const [warnings, setWarnings] = useState<string[]>(initialWarnings);
  const [error, setError] = useState<string | null>(
    initialError ??
      (interrompido
        ? "A geração anterior foi interrompida antes de terminar. Clique em tentar novamente."
        : null),
  );
  const [url, setUrl] = useState<string>(pronto ? `/t/${slug}` : "");
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(false);

  /**
   * Consome uma etapa em SSE. A geracao vai em tres requisicoes (planejar,
   * etapas 1+2, etapa 3) porque cada funcao serverless tem teto de 60s.
   */
  const consume = useCallback(
    async (path: string, esperado: "plan" | "conteudo1" | "done", body?: unknown) => {
      const abort = new AbortController();
      const limite = setTimeout(() => abort.abort(), 80_000);

      let res: Response;
      try {
        res = await fetch(`/api/treinamentos/${id}/${path}`, {
          method: "POST",
          signal: abort.signal,
          ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
        });
      } catch (err) {
        clearTimeout(limite);
        throw new Error(
          abort.signal.aborted
            ? "A geração demorou demais e foi interrompida. Tente novamente."
            : err instanceof Error
              ? err.message
              : "Falha de conexão.",
        );
      }

      if (!res.ok && !res.headers.get("content-type")?.includes("event-stream")) {
        clearTimeout(limite);
        throw new Error((await res.text()) || `Erro ${res.status} no servidor.`);
      }
      if (!res.body) {
        clearTimeout(limite);
        throw new Error("Falha na conexão com o servidor.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const result: Record<string, unknown> = {};

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const line = chunk.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const ev = JSON.parse(line.slice(6));

            if (ev.type === "step") {
              setSteps((s) => ({ ...s, [ev.step as StepId]: { state: ev.state, detail: ev.detail } }));
            } else if (ev.type === "error") {
              throw new Error(ev.message);
            } else {
              Object.assign(result, ev);
            }
          }
        }
      } catch (err) {
        throw err instanceof Error && abort.signal.aborted
          ? new Error("A geração demorou demais e foi interrompida. Tente novamente.")
          : err;
      } finally {
        clearTimeout(limite);
      }

      if (result.type !== esperado) {
        throw new Error("A geração foi interrompida antes de terminar. Tente novamente.");
      }
      return result;
    },
    [id],
  );

  const run = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    setState("running");
    setError(null);
    setSteps({});

    try {
      const { plan } = await consume("plan", "plan");
      const { parcial } = await consume("conteudo1", "conteudo1", { plan });
      const done = await consume("conteudo2", "done", { plan, parcial });
      setUrl(String(done.url ?? ""));
      setWarnings((done.warnings as string[]) ?? []);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("error");
    } finally {
      started.current = false;
    }
  }, [consume]);

  useEffect(() => {
    if (autostart && !pronto) void run();
  }, [autostart, pronto, run]);

  useEffect(() => {
    if (state !== "running") return;
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(timer);
  }, [state]);

  const fullUrl = url ? `${typeof window !== "undefined" ? window.location.origin : ""}${url}` : "";

  return (
    <div className="grid gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--app-muted)" }}>
            {state === "running"
              ? `Gerando o treinamento… ${elapsed}s`
              : state === "done"
                ? "Apresentação pronta para o treinamento."
                : state === "error"
                  ? "A geração falhou."
                  : "Pronto para gerar."}
          </p>
        </div>
        <Link href="/" className="shrink-0 text-sm font-medium" style={{ color: "var(--app-muted)" }}>
          ← Meus treinamentos
        </Link>
      </div>

      <Panel>
        <ol className="grid gap-1">
          {STEPS.map((s) => {
            const st = steps[s.id]?.state ?? "pendente";
            return (
              <li key={s.id} className="flex items-start gap-3 py-2.5">
                <StepIcon state={st} />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium"
                    style={{ color: st === "pendente" ? "var(--app-muted)" : "var(--app-text)" }}
                  >
                    {s.label}
                  </p>
                  {steps[s.id]?.detail ? (
                    <p className="mt-0.5 truncate text-xs" style={{ color: "var(--app-muted)" }}>
                      {steps[s.id]!.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>

      {state === "done" && url ? (
        <Panel className="fade-up">
          <p className="text-lg font-semibold" style={{ color: "var(--app-accent-2)" }}>
            Treinamento pronto!
          </p>
          <p className="mt-2 break-all text-sm" style={{ color: "var(--app-muted)" }}>
            {fullUrl}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 text-sm font-bold"
              style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "10px" }}
            >
              ABRIR APRESENTAÇÃO
            </a>
            <a
              href={`/api/treinamentos/${id}/export`}
              className="px-6 py-3 text-sm font-bold"
              style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}
            >
              BAIXAR .PPTX (EDITÁVEL)
            </a>
            <a
              href={`/api/treinamentos/${id}/export-pdf`}
              className="px-6 py-3 text-sm font-bold"
              style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}
            >
              BAIXAR MANUAL EM PDF
            </a>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(fullUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-6 py-3 text-sm font-bold"
              style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}
            >
              {copied ? "LINK COPIADO" : "COPIAR LINK"}
            </button>
            <button
              type="button"
              onClick={() => void run()}
              className="px-6 py-3 text-sm font-semibold"
              style={{ color: "var(--app-muted)", border: "1px solid var(--app-border)", borderRadius: "10px" }}
            >
              Gerar novamente
            </button>
          </div>

          {warnings.length ? (
            <details className="mt-6">
              <summary className="cursor-pointer text-xs font-semibold" style={{ color: "#f0b429" }}>
                {warnings.length} aviso(s) de qualidade
              </summary>
              <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--app-muted)" }}>
                {warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </Panel>
      ) : null}

      {state === "error" ? (
        <Panel>
          <p className="text-sm font-semibold" style={{ color: "#ff6b6b" }}>
            {error ?? "Erro desconhecido"}
          </p>
          <button
            type="button"
            onClick={() => void run()}
            className="mt-5 px-6 py-3 text-sm font-bold"
            style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "10px" }}
          >
            Tentar novamente
          </button>
        </Panel>
      ) : null}

      {state === "idle" ? (
        <div>
          <button
            type="button"
            onClick={() => void run()}
            className="px-8 py-3.5 text-sm font-bold"
            style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "11px" }}
          >
            GERAR TREINAMENTO
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StepIcon({ state }: { state: StepState["state"] }) {
  if (state === "done") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center"
        style={{ background: "var(--app-accent-2)", borderRadius: "999px", color: "#0a0a0a" }}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === "running") {
    return (
      <span
        className="spinner mt-0.5 h-5 w-5 shrink-0"
        style={{
          borderRadius: "999px",
          border: "2px solid var(--app-border)",
          borderTopColor: "var(--app-accent)",
        }}
      />
    );
  }
  if (state === "error") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-xs font-bold"
        style={{ background: "#ff6b6b", borderRadius: "999px", color: "#0a0a0a" }}
      >
        !
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 h-5 w-5 shrink-0"
      style={{ borderRadius: "999px", border: "2px solid var(--app-border)" }}
    />
  );
}
