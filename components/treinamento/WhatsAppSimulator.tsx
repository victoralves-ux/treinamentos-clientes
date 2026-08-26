"use client";

import { useEffect, useRef, useState } from "react";
import type { CenarioWhatsapp } from "@/lib/schema";

/**
 * Roleplay interativo de WhatsApp: revela as mensagens uma a uma, como uma
 * conversa acontecendo ao vivo, para o time do cliente praticar a leitura
 * do ritmo real de uma conversa — nao e so uma lista de texto estatica.
 */
export function WhatsAppSimulator({ cenario }: { cenario: CenarioWhatsapp }) {
  const [visiveis, setVisiveis] = useState(0);
  const [digitando, setDigitando] = useState<"consultor" | "cliente" | null>(null);
  const [tocando, setTocando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function limpar() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function reproduzir() {
    limpar();
    setVisiveis(0);
    setDigitando(null);
    setTocando(true);

    let acumulado = 0;
    cenario.mensagens.forEach((m, i) => {
      const atraso = Math.min(1400, 500 + m.texto.length * 18);
      acumulado += i === 0 ? 300 : atraso;
      const tDigitar = setTimeout(() => setDigitando(m.autor), acumulado - Math.min(500, atraso * 0.4));
      const tMostrar = setTimeout(() => {
        setDigitando(null);
        setVisiveis(i + 1);
      }, acumulado);
      timers.current.push(tDigitar, tMostrar);
    });
    const tFim = setTimeout(() => setTocando(false), acumulado + 200);
    timers.current.push(tFim);
  }

  function mostrarTudo() {
    limpar();
    setDigitando(null);
    setTocando(false);
    setVisiveis(cenario.mensagens.length);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visiveis, digitando]);

  useEffect(() => () => limpar(), []);

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
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={reproduzir}
            disabled={tocando}
            className="px-5 py-2.5 text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "9px" }}
          >
            {tocando ? "Reproduzindo…" : visiveis > 0 ? "Reproduzir de novo" : "▶ Reproduzir conversa"}
          </button>
          {!tocando && visiveis < cenario.mensagens.length ? (
            <button
              type="button"
              onClick={mostrarTudo}
              className="px-5 py-2.5 text-sm font-semibold"
              style={{ border: "1px solid #333", color: "#ccc", borderRadius: "9px" }}
            >
              Mostrar tudo
            </button>
          ) : null}
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
            <p className="text-[11px]" style={{ color: digitando ? "var(--app-accent)" : "#7a7a7a" }}>
              {digitando ? "digitando…" : "online"}
            </p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {cenario.mensagens.slice(0, visiveis).map((m, i) => (
            <Bolha key={i} autor={m.autor} texto={m.texto} hora={m.hora} />
          ))}
          {digitando ? <Digitando autor={digitando} /> : null}
          {visiveis === 0 && !digitando ? (
            <p className="pt-10 text-center text-xs" style={{ color: "#5a5a5a" }}>
              Clique em reproduzir para iniciar a simulação.
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

function Digitando({ autor }: { autor: "consultor" | "cliente" }) {
  const consultor = autor === "consultor";
  return (
    <div className={`flex ${consultor ? "justify-end" : "justify-start"}`}>
      <div
        className="flex items-center gap-1 rounded-2xl px-4 py-3"
        style={{ background: consultor ? "var(--app-accent)" : "#232323" }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="typing-dot h-1.5 w-1.5 rounded-full"
            style={{ background: consultor ? "#0a0a0a" : "#aaa", animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
