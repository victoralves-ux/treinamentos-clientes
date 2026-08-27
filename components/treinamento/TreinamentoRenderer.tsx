"use client";

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

export function TreinamentoRenderer({ spec, slug }: { spec: TreinamentoSpec; slug: string }) {
  return (
    <div className="deck-scroll">
      <Capa spec={spec} />

      <Section eyebrow="Etapa 1 · Conexão" title="Processo atual">
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--app-accent)" }}>
          {spec.etapa1.processoAtual.canais.map((c) => CANAL_LABEL[c] ?? c).join("   ·   ")}
        </p>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed sm:text-xl" style={{ color: "#e8e8e8" }}>
          {spec.etapa1.processoAtual.descricao}
        </p>
      </Section>

      {spec.etapa1.dores.length ? (
        <Section eyebrow="Etapa 1 · Conexão" title="Principais dores">
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
        <Section eyebrow="Etapa 2 · Direcionamento tático" title="Estratégias executadas">
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
        <Section eyebrow="Etapa 2 · Direcionamento tático" title="Indicadores">
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

      <Section eyebrow="Etapa 3 · Treinamento tático" title="Roleplay interativo">
        <p className="max-w-2xl text-lg leading-relaxed" style={{ color: "var(--app-muted)" }}>
          Simulações práticas de conversa no WhatsApp e de ligação, com base no que realmente acontece no dia a dia
          comercial. Use os controles para reproduzir cada cenário durante o treinamento.
        </p>
      </Section>

      {spec.etapa3.roleplayWhatsapp.map((cenario, i) => (
        <Section key={`wa-${i}`} eyebrow="" title="">
          <WhatsAppSimulator cenario={cenario} />
        </Section>
      ))}

      {spec.etapa3.roleplayLigacao.map((cenario, i) => (
        <Section key={`lig-${i}`} eyebrow="" title="">
          <CallSimulator cenario={cenario} />
        </Section>
      ))}

      <MaterialApoioSection spec={spec} slug={slug} />
    </div>
  );
}

function Capa({ spec }: { spec: TreinamentoSpec }) {
  return (
    <section className="deck-section" style={{ background: "linear-gradient(160deg,#0a0a0a,#140406)" }}>
      <p className="text-xs font-bold tracking-[0.3em]" style={{ color: "var(--app-accent)" }}>
        PULSO
      </p>
      <h1 className="font-display mt-6 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
        {spec.meta.titulo || `Treinamento Comercial — ${spec.meta.cliente}`}
      </h1>
      <p className="mt-6 text-base" style={{ color: "var(--app-muted)" }}>
        {[spec.meta.cliente, spec.meta.segmento, spec.meta.data].filter(Boolean).join("  ·  ")}
      </p>
      <ScrollHint />
    </section>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="deck-section">
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

function MaterialApoioSection({ spec, slug }: { spec: TreinamentoSpec; slug: string }) {
  const script = spec.materialApoio.scriptLigacao;
  return (
    <section className="deck-section">
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

      <a
        href={`/t/${slug}/export`}
        className="mt-10 inline-block w-fit px-6 py-3 text-sm font-bold"
        style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "10px" }}
      >
        BAIXAR APRESENTAÇÃO EM .PPTX
      </a>
    </section>
  );
}

function ScrollHint() {
  return (
    <p className="absolute bottom-10 left-[8vw] text-xs" style={{ color: "#555" }}>
      Role para começar ↓
    </p>
  );
}
