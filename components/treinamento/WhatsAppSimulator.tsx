"use client";

import { useEffect, useRef } from "react";
import type { CenarioWhatsapp } from "@/lib/schema";

/**
 * Roleplay interativo de WhatsApp: componente controlado — quem decide quantas
 * mensagens estao visiveis e o pai (TreinamentoRenderer), via teclado (setas
 * para os lados) ou pelos botoes aqui. Sem autoplay: o consultor avanca no
 * ritmo que quiser durante o treinamento.
 */
export function WhatsAppSimulator({
  cenario,
  visibleCount,
  onNext,
  onPrev,
}: {
  cenario: CenarioWhatsapp;
  visibleCount: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const total = cenario.mensagens.length;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,420px)] lg:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--app-accent)" }}>
          Roleplay · WhatsApp
        </p>
        <h3 className="font-display mt-2 text-2xl font-semibold sm:text-3xl">{cenario.titulo}</h3>
        {cenario.contexto ? (
          <p className="mt-3 max-w-md text-sm leading-relaxed" style={{ color: "var(--app-muted)" }}>
            {cenario.contexto}
          </p>
        ) : null}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={visibleCount <= 1}
            className="px-4 py-2 text-xs font-semibold disabled:opacity-30"
            style={{ border: "1px solid #333", color: "#ccc", borderRadius: "8px" }}
          >
            ← Mensagem anterior
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={visibleCount >= total}
            className="px-4 py-2 text-xs font-bold disabled:opacity-30"
            style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "8px" }}
          >
            {visibleCount >= total ? "Fim da conversa" : "Próxima mensagem →"}
          </button>
          <span className="text-xs font-semibold" style={{ color: "var(--app-muted)" }}>
            {Math.min(visibleCount, total)} / {total}
          </span>
        </div>
      </div>

      <div
        className="mx-auto flex h-[520px] w-full max-w-[380px] flex-col overflow-hidden"
        style={{ background: "#0f0f0f", border: "1px solid #262626", borderRadius: "20px" }}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#161616", borderBottom: "1px solid #262626" }}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--app-accent)", color: "#0a0a0a" }}>
            C
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Cliente</p>
            <p className="text-[11px]" style={{ color: "#7a7a7a" }}>online</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {cenario.mensagens.slice(0, visibleCount).map((m, i) => (
            <Bolha key={i} autor={m.autor} texto={m.texto} hora={m.hora} />
          ))}
          {visibleCount === 0 ? (
            <p className="pt-10 text-center text-xs" style={{ color: "#5a5a5a" }}>
              Use → para iniciar a simulação.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Bolha({ autor, texto, hora }: { autor: "consultor" | "cliente"; texto: string; hora?: string }) {
  const consultor = autor === "consultor";
  return (
    <div className={`chat-bubble-in flex ${consultor ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug"
        style={
          consultor
            ? { background: "var(--app-accent)", color: "#0a0a0a", borderBottomRightRadius: 4 }
            : { background: "#232323", color: "#f0f0f0", borderBottomLeftRadius: 4 }
        }
      >
        {texto}
        {hora ? (
          <span className="ml-2 align-bottom text-[10px] opacity-70">{hora}</span>
        ) : null}
      </div>
    </div>
  );
}
