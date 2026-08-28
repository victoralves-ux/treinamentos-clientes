"use client";

import Link from "next/link";
import { useState } from "react";
import { Panel } from "@/components/ui/AppShell";
import type { CenarioLigacao, CenarioWhatsapp, ScriptLigacao, TreinamentoSpec } from "@/lib/schema";

const CANAIS_VALIDOS = ["whatsapp", "ligacao", "call", "email", "instagram", "sms", "presencial", "outro"] as const;
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

function moveItem<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copia = [...arr];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

function ReorderButtons({ index, total, onMove }: { index: number; total: number; onMove: (dir: -1 | 1) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        aria-label="Mover para cima"
        className="flex h-6 w-6 items-center justify-center text-xs disabled:opacity-25"
        style={{ border: "1px solid var(--app-border)", borderRadius: "6px", color: "var(--app-muted)" }}
      >
        ↑
      </button>
      <button
        type="button"
        disabled={index === total - 1}
        onClick={() => onMove(1)}
        aria-label="Mover para baixo"
        className="flex h-6 w-6 items-center justify-center text-xs disabled:opacity-25"
        style={{ border: "1px solid var(--app-border)", borderRadius: "6px", color: "var(--app-muted)" }}
      >
        ↓
      </button>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="field" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        className="field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--app-muted)" }}>
      {children}
    </h2>
  );
}

/**
 * Editor do treinamento: texto de todo campo e livremente editavel, e listas
 * (dores, estrategias, indicadores, cenarios de roleplay, objecoes,
 * cronograma) tem botoes para reordenar. Roleplay WhatsApp e Ligacao sao
 * slides de verdade no deck — reordenar aqui reordena os slides la.
 * "Salvar" grava o spec inteiro via PATCH /api/treinamentos/[id]/spec.
 */
export function TreinamentoEditor({ id, slug, initialSpec }: { id: string; slug: string; initialSpec: TreinamentoSpec }) {
  const [spec, setSpec] = useState<TreinamentoSpec>(initialSpec);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    try {
      const res = await fetch(`/api/treinamentos/${id}/spec`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(spec),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  const setMeta = (patch: Partial<TreinamentoSpec["meta"]>) => setSpec((s) => ({ ...s, meta: { ...s.meta, ...patch } }));

  const setProcesso = (patch: Partial<TreinamentoSpec["etapa1"]["processoAtual"]>) =>
    setSpec((s) => ({ ...s, etapa1: { ...s.etapa1, processoAtual: { ...s.etapa1.processoAtual, ...patch } } }));
  const toggleCanal = (canal: (typeof CANAIS_VALIDOS)[number]) => {
    const atual = spec.etapa1.processoAtual.canais;
    setProcesso({ canais: atual.includes(canal) ? atual.filter((c) => c !== canal) : [...atual, canal] });
  };

  const updateDor = (i: number, patch: Partial<TreinamentoSpec["etapa1"]["dores"][number]>) =>
    setSpec((s) => ({ ...s, etapa1: { ...s.etapa1, dores: s.etapa1.dores.map((d, j) => (j === i ? { ...d, ...patch } : d)) } }));
  const moveDor = (i: number, dir: -1 | 1) =>
    setSpec((s) => ({ ...s, etapa1: { ...s.etapa1, dores: moveItem(s.etapa1.dores, i, dir) } }));

  const updateEstrategia = (i: number, patch: Partial<TreinamentoSpec["etapa2"]["estrategiasExecutadas"][number]>) =>
    setSpec((s) => ({
      ...s,
      etapa2: { ...s.etapa2, estrategiasExecutadas: s.etapa2.estrategiasExecutadas.map((e, j) => (j === i ? { ...e, ...patch } : e)) },
    }));
  const moveEstrategia = (i: number, dir: -1 | 1) =>
    setSpec((s) => ({ ...s, etapa2: { ...s.etapa2, estrategiasExecutadas: moveItem(s.etapa2.estrategiasExecutadas, i, dir) } }));

  const updateIndicador = (i: number, patch: Partial<TreinamentoSpec["etapa2"]["indicadores"][number]>) =>
    setSpec((s) => ({ ...s, etapa2: { ...s.etapa2, indicadores: s.etapa2.indicadores.map((ind, j) => (j === i ? { ...ind, ...patch } : ind)) } }));
  const moveIndicador = (i: number, dir: -1 | 1) =>
    setSpec((s) => ({ ...s, etapa2: { ...s.etapa2, indicadores: moveItem(s.etapa2.indicadores, i, dir) } }));

  const updateWa = (i: number, patch: Partial<CenarioWhatsapp>) =>
    setSpec((s) => ({ ...s, etapa3: { ...s.etapa3, roleplayWhatsapp: s.etapa3.roleplayWhatsapp.map((c, j) => (j === i ? { ...c, ...patch } : c)) } }));
  const moveWa = (i: number, dir: -1 | 1) =>
    setSpec((s) => ({ ...s, etapa3: { ...s.etapa3, roleplayWhatsapp: moveItem(s.etapa3.roleplayWhatsapp, i, dir) } }));
  const updateWaMensagem = (ci: number, mi: number, patch: Partial<CenarioWhatsapp["mensagens"][number]>) =>
    setSpec((s) => ({
      ...s,
      etapa3: {
        ...s.etapa3,
        roleplayWhatsapp: s.etapa3.roleplayWhatsapp.map((c, j) =>
          j === ci ? { ...c, mensagens: c.mensagens.map((m, k) => (k === mi ? { ...m, ...patch } : m)) } : c,
        ),
      },
    }));

  const updateLig = (i: number, patch: Partial<CenarioLigacao>) =>
    setSpec((s) => ({ ...s, etapa3: { ...s.etapa3, roleplayLigacao: s.etapa3.roleplayLigacao.map((c, j) => (j === i ? { ...c, ...patch } : c)) } }));
  const moveLig = (i: number, dir: -1 | 1) =>
    setSpec((s) => ({ ...s, etapa3: { ...s.etapa3, roleplayLigacao: moveItem(s.etapa3.roleplayLigacao, i, dir) } }));
  const updateLigRoteiro = (ci: number, ri: number, patch: Partial<CenarioLigacao["roteiro"][number]>) =>
    setSpec((s) => ({
      ...s,
      etapa3: {
        ...s.etapa3,
        roleplayLigacao: s.etapa3.roleplayLigacao.map((c, j) =>
          j === ci ? { ...c, roteiro: c.roteiro.map((r, k) => (k === ri ? { ...r, ...patch } : r)) } : c,
        ),
      },
    }));

  const setScript = (patch: Partial<ScriptLigacao>) =>
    setSpec((s) => ({ ...s, materialApoio: { ...s.materialApoio, scriptLigacao: { ...s.materialApoio.scriptLigacao, ...patch } } }));
  const updateObjecao = (i: number, patch: Partial<ScriptLigacao["objecoes"][number]>) =>
    setSpec((s) => ({
      ...s,
      materialApoio: {
        ...s.materialApoio,
        scriptLigacao: { ...s.materialApoio.scriptLigacao, objecoes: s.materialApoio.scriptLigacao.objecoes.map((o, j) => (j === i ? { ...o, ...patch } : o)) },
      },
    }));
  const moveObjecao = (i: number, dir: -1 | 1) =>
    setSpec((s) => ({
      ...s,
      materialApoio: { ...s.materialApoio, scriptLigacao: { ...s.materialApoio.scriptLigacao, objecoes: moveItem(s.materialApoio.scriptLigacao.objecoes, i, dir) } },
    }));

  const updateCronograma = (i: number, patch: Partial<TreinamentoSpec["materialApoio"]["cronogramaFollowup"][number]>) =>
    setSpec((s) => ({
      ...s,
      materialApoio: { ...s.materialApoio, cronogramaFollowup: s.materialApoio.cronogramaFollowup.map((c, j) => (j === i ? { ...c, ...patch } : c)) },
    }));
  const moveCronograma = (i: number, dir: -1 | 1) =>
    setSpec((s) => ({ ...s, materialApoio: { ...s.materialApoio, cronogramaFollowup: moveItem(s.materialApoio.cronogramaFollowup, i, dir) } }));

  return (
    <div className="grid gap-5 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Editar treinamento</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--app-muted)" }}>
            Edite o texto e reordene os itens. Roleplay de WhatsApp e ligação são slides — reordenar aqui reordena a
            apresentação.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/t/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-semibold"
            style={{ border: "1px solid var(--app-border)", borderRadius: "9px", color: "var(--app-text)" }}
          >
            Ver apresentação
          </Link>
          <Link
            href={`/treinamento/${id}`}
            className="px-4 py-2 text-sm font-semibold"
            style={{ color: "var(--app-muted)" }}
          >
            ← Voltar
          </Link>
        </div>
      </div>

      <Panel>
        <SecaoTitulo>Identificação</SecaoTitulo>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo label="Título da apresentação" value={spec.meta.titulo} onChange={(v) => setMeta({ titulo: v })} />
          <Campo label="Cliente" value={spec.meta.cliente} onChange={(v) => setMeta({ cliente: v })} />
          <Campo label="Segmento" value={spec.meta.segmento} onChange={(v) => setMeta({ segmento: v })} />
          <Campo label="Data" value={spec.meta.data} onChange={(v) => setMeta({ data: v })} />
        </div>
      </Panel>

      <Panel>
        <SecaoTitulo>Etapa 1 — Processo atual</SecaoTitulo>
        <div className="mt-4 grid gap-4">
          <div>
            <label className="label">Canais</label>
            <div className="flex flex-wrap gap-2">
              {CANAIS_VALIDOS.map((c) => {
                const ativo = spec.etapa1.processoAtual.canais.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCanal(c)}
                    className="px-3 py-1.5 text-xs font-semibold"
                    style={
                      ativo
                        ? { background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "999px" }
                        : { border: "1px solid var(--app-border)", color: "var(--app-muted)", borderRadius: "999px" }
                    }
                  >
                    {CANAL_LABEL[c]}
                  </button>
                );
              })}
            </div>
          </div>
          <Area label="Descrição do processo" value={spec.etapa1.processoAtual.descricao} onChange={(v) => setProcesso({ descricao: v })} />
        </div>
      </Panel>

      {spec.etapa1.dores.length ? (
        <Panel>
          <SecaoTitulo>Etapa 1 — Dores</SecaoTitulo>
          <div className="mt-4 grid gap-3">
            {spec.etapa1.dores.map((d, i) => (
              <div key={i} className="flex gap-3 p-4" style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}>
                <ReorderButtons index={i} total={spec.etapa1.dores.length} onMove={(dir) => moveDor(i, dir)} />
                <div className="grid flex-1 gap-3">
                  <Campo label={`Dor ${i + 1} — título`} value={d.titulo} onChange={(v) => updateDor(i, { titulo: v })} />
                  <Area label="Detalhe" value={d.detalhe} onChange={(v) => updateDor(i, { detalhe: v })} rows={2} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {spec.etapa2.estrategiasExecutadas.length ? (
        <Panel>
          <SecaoTitulo>Etapa 2 — Estratégias executadas</SecaoTitulo>
          <div className="mt-4 grid gap-3">
            {spec.etapa2.estrategiasExecutadas.map((e, i) => (
              <div key={i} className="flex gap-3 p-4" style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}>
                <ReorderButtons index={i} total={spec.etapa2.estrategiasExecutadas.length} onMove={(dir) => moveEstrategia(i, dir)} />
                <div className="grid flex-1 gap-3">
                  <Campo label="Nome" value={e.nome} onChange={(v) => updateEstrategia(i, { nome: v })} />
                  <Area label="Descrição" value={e.descricao} onChange={(v) => updateEstrategia(i, { descricao: v })} rows={2} />
                  <Campo label="Resultado" value={e.resultado} onChange={(v) => updateEstrategia(i, { resultado: v })} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {spec.etapa2.indicadores.length ? (
        <Panel>
          <SecaoTitulo>Etapa 2 — Indicadores</SecaoTitulo>
          <div className="mt-4 grid gap-3">
            {spec.etapa2.indicadores.map((ind, i) => (
              <div key={i} className="flex gap-3 p-4" style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}>
                <ReorderButtons index={i} total={spec.etapa2.indicadores.length} onMove={(dir) => moveIndicador(i, dir)} />
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <Campo label="Nome do indicador" value={ind.label} onChange={(v) => updateIndicador(i, { label: v })} />
                  <Campo label="Valor atual" value={ind.atual} onChange={(v) => updateIndicador(i, { atual: v })} />
                  <Campo label="Meta" value={ind.meta} onChange={(v) => updateIndicador(i, { meta: v })} />
                  <Campo label="Variação / observação" value={ind.variacao} onChange={(v) => updateIndicador(i, { variacao: v })} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {spec.etapa3.roleplayWhatsapp.map((c, i) => (
        <Panel key={`wa-${i}`}>
          <div className="flex items-start justify-between gap-3">
            <SecaoTitulo>{`Slide — Roleplay WhatsApp ${i + 1}`}</SecaoTitulo>
            <ReorderButtons index={i} total={spec.etapa3.roleplayWhatsapp.length} onMove={(dir) => moveWa(i, dir)} />
          </div>
          <div className="mt-4 grid gap-3">
            <Campo label="Título do cenário" value={c.titulo} onChange={(v) => updateWa(i, { titulo: v })} />
            <Area label="Contexto" value={c.contexto} onChange={(v) => updateWa(i, { contexto: v })} rows={2} />
            <div className="grid gap-2">
              <label className="label">Mensagens</label>
              {c.mensagens.map((m, mi) => (
                <div key={mi} className="flex items-center gap-2">
                  <select
                    className="field"
                    style={{ maxWidth: 130 }}
                    value={m.autor}
                    onChange={(e) => updateWaMensagem(i, mi, { autor: e.target.value as "consultor" | "cliente" })}
                  >
                    <option value="consultor">Consultor</option>
                    <option value="cliente">Cliente</option>
                  </select>
                  <input className="field" value={m.texto} onChange={(e) => updateWaMensagem(i, mi, { texto: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
        </Panel>
      ))}

      {spec.etapa3.roleplayLigacao.map((c, i) => (
        <Panel key={`lig-${i}`}>
          <div className="flex items-start justify-between gap-3">
            <SecaoTitulo>{`Slide — Simulação de ligação ${i + 1}`}</SecaoTitulo>
            <ReorderButtons index={i} total={spec.etapa3.roleplayLigacao.length} onMove={(dir) => moveLig(i, dir)} />
          </div>
          <div className="mt-4 grid gap-3">
            <Campo label="Título do cenário" value={c.titulo} onChange={(v) => updateLig(i, { titulo: v })} />
            <Area label="Contexto" value={c.contexto} onChange={(v) => updateLig(i, { contexto: v })} rows={2} />
            <div className="grid gap-3">
              {c.roteiro.map((r, ri) => (
                <div key={ri} className="p-3" style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--app-accent)" }}>
                    {r.etapa}
                  </p>
                  <div className="grid gap-2">
                    <Area label="Fala sugerida" value={r.falaSugerida} onChange={(v) => updateLigRoteiro(i, ri, { falaSugerida: v })} rows={2} />
                    {r.objecaoComum || r.respostaObjecao ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Campo label="Objeção comum" value={r.objecaoComum ?? ""} onChange={(v) => updateLigRoteiro(i, ri, { objecaoComum: v })} />
                        <Campo label="Resposta" value={r.respostaObjecao ?? ""} onChange={(v) => updateLigRoteiro(i, ri, { respostaObjecao: v })} />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      ))}

      <Panel>
        <SecaoTitulo>Material de apoio — Script de ligação</SecaoTitulo>
        <div className="mt-4 grid gap-3">
          <Area label="Abertura" value={spec.materialApoio.scriptLigacao.abertura} onChange={(v) => setScript({ abertura: v })} rows={2} />
          <Area label="Qualificação" value={spec.materialApoio.scriptLigacao.qualificacao} onChange={(v) => setScript({ qualificacao: v })} rows={2} />
          <Area label="Apresentação" value={spec.materialApoio.scriptLigacao.apresentacao} onChange={(v) => setScript({ apresentacao: v })} rows={2} />
          <Area label="Fechamento" value={spec.materialApoio.scriptLigacao.fechamento} onChange={(v) => setScript({ fechamento: v })} rows={2} />

          {spec.materialApoio.scriptLigacao.objecoes.length ? (
            <div className="grid gap-2">
              <label className="label">Contorno de objeções</label>
              {spec.materialApoio.scriptLigacao.objecoes.map((o, i) => (
                <div key={i} className="flex gap-3 p-3" style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}>
                  <ReorderButtons index={i} total={spec.materialApoio.scriptLigacao.objecoes.length} onMove={(dir) => moveObjecao(i, dir)} />
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <Campo label="Objeção" value={o.objecao} onChange={(v) => updateObjecao(i, { objecao: v })} />
                    <Campo label="Resposta" value={o.resposta} onChange={(v) => updateObjecao(i, { resposta: v })} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Panel>

      {spec.materialApoio.cronogramaFollowup.length ? (
        <Panel>
          <SecaoTitulo>Material de apoio — Cronograma de follow-up</SecaoTitulo>
          <div className="mt-4 grid gap-3">
            {spec.materialApoio.cronogramaFollowup.map((c, i) => (
              <div key={i} className="flex gap-3 p-3" style={{ background: "var(--app-panel-2)", border: "1px solid var(--app-border)", borderRadius: "10px" }}>
                <ReorderButtons index={i} total={spec.materialApoio.cronogramaFollowup.length} onMove={(dir) => moveCronograma(i, dir)} />
                <div className="grid flex-1 gap-2 sm:grid-cols-4">
                  <Campo label="Dia" value={c.dia} onChange={(v) => updateCronograma(i, { dia: v })} />
                  <div>
                    <label className="label">Canal</label>
                    <select className="field" value={c.canal} onChange={(e) => updateCronograma(i, { canal: e.target.value as TreinamentoSpec["materialApoio"]["cronogramaFollowup"][number]["canal"] })}>
                      {CANAIS_VALIDOS.map((canal) => (
                        <option key={canal} value={canal}>
                          {CANAL_LABEL[canal]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Campo label="Objetivo" value={c.objetivo} onChange={(v) => updateCronograma(i, { objetivo: v })} />
                  <Campo label="Mensagem de exemplo" value={c.mensagemExemplo} onChange={(v) => updateCronograma(i, { mensagemExemplo: v })} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <div
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 px-5 py-4 backdrop-blur"
        style={{ background: "rgba(10,10,10,0.9)", borderTop: "1px solid var(--app-border)" }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
          <p className="text-xs" style={{ color: erro ? "#ff6b6b" : "var(--app-muted)" }}>
            {erro ?? (salvo ? "Alterações salvas." : "As alterações só valem depois de salvar.")}
          </p>
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={salvando}
            className="px-6 py-2.5 text-sm font-bold disabled:opacity-60"
            style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "9px" }}
          >
            {salvando ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
