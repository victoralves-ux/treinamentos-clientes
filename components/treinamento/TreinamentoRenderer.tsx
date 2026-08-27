"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TreinamentoSpec } from "@/lib/schema";
import { CallSimulator } from "./CallSimulator";
import { WhatsAppSimulator } from "./WhatsAppSimulator";

const CANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  call: "Call",
  email: "E-mail",
  instagram: "Instagram",
  sms: "SMS",
  presencial: "Presencial",
  outro: "Outro",
};

type SlideKind = { type: "wa"; scenario: number } | { type: "lig"; scenario: number } | { type: "other" };
type SetRef = (i: number) => (el: HTMLElement | null) => void;

/**
 * Apresentacao publica. Navegacao por teclado: ↑/↓ (ou PageUp/PageDown) troca
 * de slide, ←/→ avanca/volta as mensagens do roleplay ativo — controlavel,
 * sem autoplay, para o consultor conduzir no ritmo do treinamento. Um
 * IntersectionObserver acompanha qual slide esta visivel mesmo quando o
 * cliente rola com o mouse, para as duas formas de navegar ficarem em sincronia.
 */
export function TreinamentoRenderer({ spec, slug }: { spec: TreinamentoSpec; slug: string }) {
  const slideKinds = useMemo<SlideKind[]>(() => {
    const kinds: SlideKind[] = [{ type: "other" }, { type: "other" }];
    if (spec.etapa1.dores.length) kinds.push({ type: "other" });
    if (spec.etapa2.estrategiasExecutadas.length) kinds.push({ type: "other" });
    if (spec.etapa2.indicadores.length) kinds.push({ type: "other" });
    kinds.push({ type: "other" });
    spec.etapa3.roleplayWhatsapp.forEach((_, i) => kinds.push({ type: "wa", scenario: i }));
    spec.etapa3.roleplayLigacao.forEach((_, i) => kinds.push({ type: "lig", scenario: i }));
    kinds.push({ type: "other" });
    return kinds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  const [waStep, setWaStep] = useState<number[]>(() => spec.etapa3.roleplayWhatsapp.map(() => 1));
  const [ligStep, setLigStep] = useState<number[]>(() => spec.etapa3.roleplayLigacao.map(() => 0));
  const [current, setCurrent] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setCurrent((atual) => {
          let melhor = atual;
          let melhorRatio = 0;
          for (const entry of entries) {
            const idx = Number((entry.target as HTMLElement).dataset.slideIndex);
            if (entry.isIntersecting && entry.intersectionRatio > melhorRatio) {
              melhorRatio = entry.intersectionRatio;
              melhor = idx;
            }
          }
          return melhorRatio > 0 ? melhor : atual;
        });
      },
      { root, threshold: [0.5, 0.75, 1] },
    );
    sectionRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [slideKinds.length]);

  const goToSlide = useCallback(
    (idx: number) => {
      const alvo = Math.max(0, Math.min(slideKinds.length - 1, idx));
      sectionRefs.current[alvo]?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [slideKinds.length],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (alvo && ["INPUT", "TEXTAREA"].includes(alvo.tagName)) return;

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goToSlide(current + 1);
        return;
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goToSlide(current - 1);
        return;
      }

      const kind = slideKinds[current];
      if (!kind || kind.type === "other") return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (kind.type === "wa") {
          const total = spec.etapa3.roleplayWhatsapp[kind.scenario].mensagens.length;
          setWaStep((s) => s.map((v, i) => (i === kind.scenario ? Math.min(total, v + 1) : v)));
        } else {
          const max = spec.etapa3.roleplayLigacao[kind.scenario].roteiro.length - 1;
          setLigStep((s) => s.map((v, i) => (i === kind.scenario ? Math.min(max, v + 1) : v)));
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (kind.type === "wa") {
          setWaStep((s) => s.map((v, i) => (i === kind.scenario ? Math.max(1, v - 1) : v)));
        } else {
          setLigStep((s) => s.map((v, i) => (i === kind.scenario ? Math.max(0, v - 1) : v)));
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, slideKinds, goToSlide, spec]);

  let cursor = -1;
  const nextIndex = () => {
    cursor += 1;
    return cursor;
  };
  const setRef: SetRef = (i) => (el) => {
    sectionRefs.current[i] = el;
  };

  const kindAtivo = slideKinds[current];

  return (
    <div className="deck-scroll" ref={scrollRef}>
      <Capa spec={spec} slideIndex={nextIndex()} setRef={setRef} />

      <Section slideIndex={nextIndex()} setRef={setRef} eyebrow="Etapa 1 · Conexão" title="Processo atual">
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--app-accent)" }}>
          {spec.etapa1.processoAtual.canais.map((c) => CANAL_LABEL[c] ?? c).join("   ·   ")}
        </p>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed sm:text-xl" style={{ color: "#e8e8e8" }}>
          {spec.etapa1.processoAtual.descricao}
        </p>
      </Section>

      {spec.etapa1.dores.length ? (
        <Section slideIndex={nextIndex()} setRef={setRef} eyebrow="Etapa 1 · Conexão" title="Principais dores">
          <div className="grid max-w-3xl gap-5">
            {spec.etapa1.dores.map((d, i) => (
              <div key={i} className="flex gap-4">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--app-accent)" }} />
                <div>
                  <p className="text-lg font-semibold">{d.titulo}</p>
                  {d.detalhe ? (
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--app-muted)" }}>
                      {d.detalhe}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {spec.etapa2.estrategiasExecutadas.length ? (
        <Section slideIndex={nextIndex()} setRef={setRef} eyebrow="Etapa 2 · Direcionamento tático" title="Estratégias executadas">
          <div className="grid gap-4 sm:grid-cols-2">
            {spec.etapa2.estrategiasExecutadas.map((e, i) => (
              <div key={i} className="p-5" style={{ background: "#131313", border: "1px solid #262626", borderRadius: "14px" }}>
                <p className="text-base font-semibold">{e.nome}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--app-muted)" }}>
                  {e.descricao}
                </p>
                {e.resultado ? (
                  <p className="mt-3 text-sm font-semibold" style={{ color: "var(--app-accent-2)" }}>
                    → {e.resultado}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {spec.etapa2.indicadores.length ? (
        <Section slideIndex={nextIndex()} setRef={setRef} eyebrow="Etapa 2 · Direcionamento tático" title="Indicadores">
          <div className="grid gap-5 sm:grid-cols-3">
            {spec.etapa2.indicadores.map((ind, i) => (
              <div key={i} className="p-6" style={{ background: "#131313", border: "1px solid #262626", borderRadius: "14px" }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--app-muted)" }}>
                  {ind.label}
                </p>
                <p className="font-display mt-2 text-4xl font-semibold" style={{ color: "var(--app-accent)" }}>
                  {ind.atual}
                </p>
                {ind.meta ? (
                  <p className="mt-2 text-sm" style={{ color: "#ddd" }}>
                    Meta: {ind.meta}
                  </p>
                ) : null}
                {ind.variacao ? (
                  <p className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>
                    {ind.variacao}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section slideIndex={nextIndex()} setRef={setRef} eyebrow="Etapa 3 · Treinamento tático" title="Roleplay interativo">
        <p className="max-w-2xl text-lg leading-relaxed" style={{ color: "var(--app-muted)" }}>
          Simulações práticas de conversa no WhatsApp e de ligação, com base no que realmente acontece no dia a dia
          comercial. Use ← → para avançar e voltar pelas mensagens com calma.
        </p>
      </Section>

      {spec.etapa3.roleplayWhatsapp.map((cenario, i) => {
        const idx = nextIndex();
        return (
          <Section key={`wa-${i}`} slideIndex={idx} setRef={setRef} eyebrow="" title="">
            <WhatsAppSimulator
              cenario={cenario}
              visibleCount={waStep[i]}
              onNext={() => setWaStep((s) => s.map((v, j) => (j === i ? Math.min(cenario.mensagens.length, v + 1) : v)))}
              onPrev={() => setWaStep((s) => s.map((v, j) => (j === i ? Math.max(1, v - 1) : v)))}
            />
          </Section>
        );
      })}

      {spec.etapa3.roleplayLigacao.map((cenario, i) => {
        const idx = nextIndex();
        return (
          <Section key={`lig-${i}`} slideIndex={idx} setRef={setRef} eyebrow="" title="">
            <CallSimulator
              cenario={cenario}
              stepIndex={ligStep[i]}
              onStepChange={(v) => setLigStep((s) => s.map((val, j) => (j === i ? v : val)))}
            />
          </Section>
        );
      })}

      <MaterialApoioSection spec={spec} slug={slug} slideIndex={nextIndex()} setRef={setRef} />

      <SlideProgress total={slideKinds.length} current={current} onJump={goToSlide} />
      <KeyboardHint interativo={kindAtivo?.type !== "other"} />
    </div>
  );
}

function Capa({ spec, slideIndex, setRef }: { spec: TreinamentoSpec; slideIndex: number; setRef: SetRef }) {
  return (
    <section
      ref={setRef(slideIndex)}
      data-slide-index={slideIndex}
      className="deck-section"
      style={{ background: "linear-gradient(160deg,#0a0a0a,#140406)" }}
    >
      <p className="text-xs font-bold tracking-[0.3em]" style={{ color: "var(--app-accent)" }}>
        PULSO
      </p>
      <h1 className="font-display mt-6 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
        {spec.meta.titulo || `Treinamento Comercial — ${spec.meta.cliente}`}
      </h1>
      <p className="mt-6 text-base" style={{ color: "var(--app-muted)" }}>
        {[spec.meta.cliente, spec.meta.segmento, spec.meta.data].filter(Boolean).join("  ·  ")}
      </p>
    </section>
  );
}

function Section({
  slideIndex,
  setRef,
  eyebrow,
  title,
  children,
}: {
  slideIndex: number;
  setRef: SetRef;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section ref={setRef(slideIndex)} data-slide-index={slideIndex} className="deck-section">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--app-accent)" }}>
          {eyebrow}
        </p>
      ) : null}
      {title ? <h2 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">{title}</h2> : null}
      <div className={title || eyebrow ? "mt-8" : ""}>{children}</div>
    </section>
  );
}

function MaterialApoioSection({
  spec,
  slug,
  slideIndex,
  setRef,
}: {
  spec: TreinamentoSpec;
  slug: string;
  slideIndex: number;
  setRef: SetRef;
}) {
  const script = spec.materialApoio.scriptLigacao;
  return (
    <section ref={setRef(slideIndex)} data-slide-index={slideIndex} className="deck-section">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--app-accent)" }}>
        Material de apoio
      </p>
      <h2 className="font-display mt-3 text-3xl font-semibold sm:text-4xl">Script de ligação e cronograma</h2>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="grid gap-4">
          {[
            ["Abertura", script.abertura],
            ["Qualificação", script.qualificacao],
            ["Apresentação", script.apresentacao],
            ["Fechamento", script.fechamento],
          ]
            .filter(([, v]) => v)
            .map(([label, texto]) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--app-accent)" }}>
                  {label}
                </p>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: "#ddd" }}>
                  {texto}
                </p>
              </div>
            ))}
          {script.objecoes.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--app-accent)" }}>
                Contorno de objeções
              </p>
              <div className="mt-2 grid gap-2">
                {script.objecoes.map((o, i) => (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: "#ddd" }}>
                    <span style={{ color: "var(--app-muted)" }}>{o.objecao} → </span>
                    {o.resposta}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {spec.materialApoio.cronogramaFollowup.length ? (
          <div className="overflow-hidden" style={{ border: "1px solid #262626", borderRadius: "12px" }}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ background: "#131313" }}>
                  <th className="px-3 py-2 font-semibold" style={{ color: "var(--app-accent)" }}>Dia</th>
                  <th className="px-3 py-2 font-semibold" style={{ color: "var(--app-accent)" }}>Canal</th>
                  <th className="px-3 py-2 font-semibold" style={{ color: "var(--app-accent)" }}>Objetivo</th>
                </tr>
              </thead>
              <tbody>
                {spec.materialApoio.cronogramaFollowup.map((c, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #262626" }}>
                    <td className="px-3 py-2 font-semibold">{c.dia}</td>
                    <td className="px-3 py-2" style={{ color: "var(--app-muted)" }}>{CANAL_LABEL[c.canal] ?? c.canal}</td>
                    <td className="px-3 py-2" style={{ color: "#ddd" }}>{c.objetivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href={`/t/${slug}/export`}
          className="inline-block w-fit px-6 py-3 text-sm font-bold"
          style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "10px" }}
        >
          BAIXAR APRESENTAÇÃO EM .PPTX
        </a>
        <a
          href={`/t/${slug}/export-pdf`}
          className="inline-block w-fit px-6 py-3 text-sm font-bold"
          style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", color: "var(--app-text)", borderRadius: "10px" }}
        >
          BAIXAR MANUAL EM PDF
        </a>
      </div>
    </section>
  );
}

function SlideProgress({ total, current, onJump }: { total: number; current: number; onJump: (i: number) => void }) {
  return (
    <div className="slide-progress">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Ir para o slide ${i + 1}`}
          onClick={() => onJump(i)}
          className={`slide-dot${i === current ? " active" : ""}`}
        />
      ))}
    </div>
  );
}

function KeyboardHint({ interativo }: { interativo: boolean }) {
  return (
    <div className="keyboard-hint">
      <span>
        <kbd>↑</kbd> <kbd>↓</kbd> navegar slides
      </span>
      {interativo ? (
        <span>
          <kbd>←</kbd> <kbd>→</kbd> avançar mensagens
        </span>
      ) : null}
    </div>
  );
}
