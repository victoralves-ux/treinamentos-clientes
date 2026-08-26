"use client";

import { useState } from "react";
import type { CenarioLigacao } from "@/lib/schema";

/**
 * Simulacao de ligacao: navega pelas 5 etapas do roteiro uma de cada vez,
 * como se estivesse conduzindo a chamada ao vivo, com a objecao mais comum
 * escondida ate o consultor pedir para revelar.
 */
export function CallSimulator({ cenario }: { cenario: CenarioLigacao }) {
  const [atual, setAtual] = useState(0);
  const [revelarObjecao, setRevelarObjecao] = useState(false);

  const etapa = cenario.roteiro[atual];
  const ultima = atual === cenario.roteiro.length - 1;

  function ir(delta: number) {
    setRevelarObjecao(false);
    setAtual((a) => Math.max(0, Math.min(cenario.roteiro.length - 1, a + delta)));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,440px)] lg:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--app-accent)" }}>
          Simulação de ligação
        </p>
        <h3 className="font-display mt-2 text-2xl font-semibold sm:text-3xl">{cenario.titulo}</h3>
        {cenario.contexto ? (
          <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: "var(--app-muted)" }}>
            {cenario.contexto}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {cenario.roteiro.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setAtual(i);
                setRevelarObjecao(false);
              }}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={
                i === atual
                  ? { background: "var(--app-accent)", color: "#0a0a0a" }
                  : i < atual
                    ? { background: "#232323", color: "#ccc" }
                    : { background: "transparent", border: "1px solid #333", color: "#777" }
              }
            >
              {i + 1}. {r.etapa}
            </button>
          ))}
        </div>
      </div>

      <div
        className="mx-auto flex w-full max-w-[440px] flex-col gap-4 p-6"
        style={{ background: "#101010", border: "1px solid #262626", borderRadius: "18px" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--app-accent)" }}>
          {atual + 1}/{cenario.roteiro.length} · {etapa.etapa}
        </p>
        <p className="text-[15px] leading-relaxed text-white">{etapa.falaSugerida}</p>

        {etapa.objecaoComum ? (
          <div className="mt-2">
            {revelarObjecao ? (
              <div className="fade-up rounded-xl p-3.5" style={{ background: "#1c1c1c", border: "1px solid #2c2c2c" }}>
                <p className="text-xs font-semibold" style={{ color: "#ff8a8a" }}>
                  Objeção comum: {etapa.objecaoComum}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "#ddd" }}>
                  {etapa.respostaObjecao}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRevelarObjecao(true)}
                className="text-xs font-semibold underline decoration-dotted"
                style={{ color: "var(--app-muted)" }}
              >
                Revelar objeção comum nesta etapa
              </button>
            )}
          </div>
        ) : null}

        <div className="mt-2 flex justify-between">
          <button
            type="button"
            onClick={() => ir(-1)}
            disabled={atual === 0}
            className="px-4 py-2 text-xs font-semibold disabled:opacity-30"
            style={{ border: "1px solid #333", color: "#ccc", borderRadius: "8px" }}
          >
            ← Etapa anterior
          </button>
          <button
            type="button"
            onClick={() => ir(1)}
            disabled={ultima}
            className="px-4 py-2 text-xs font-bold disabled:opacity-30"
            style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "8px" }}
          >
            {ultima ? "Fim do roteiro" : "Próxima etapa →"}
          </button>
        </div>
      </div>
    </div>
  );
}
