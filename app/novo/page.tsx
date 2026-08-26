"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell, Panel } from "@/components/ui/AppShell";
import { ContextExtractor } from "@/components/ui/ContextExtractor";
import type { ClientContext } from "@/lib/context";

type Form = Record<string, string>;

export default function NovoTreinamento() {
  const router = useRouter();
  const [form, setForm] = useState<Form>({});
  const [context, setContext] = useState<ClientContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /**
   * Leva o briefing extraido para os campos do formulario. Só preenche o que
   * está vazio: o que o consultor digitou tem prioridade sobre a extração.
   */
  function aplicarContexto(ctx: ClientContext) {
    setContext(ctx);
    const preenchidos: string[] = [];

    const cliente = ctx.cliente ?? {};
    const processo = ctx.processo_atual ?? {};

    const dores = (ctx.dores ?? [])
      .filter((d) => d.titulo)
      .map((d) => (d.detalhe ? `${d.titulo}: ${d.detalhe}` : d.titulo))
      .join("\n");
    const estrategias = (ctx.estrategias_executadas ?? [])
      .filter((e) => e.nome)
      .map((e) => [e.nome, e.descricao, e.resultado].filter(Boolean).join(" — "))
      .join("\n");
    const metricas = (ctx.metricas ?? [])
      .filter((m) => m.label)
      .map((m) => `${m.label}: atual ${m.atual ?? "?"}${m.meta ? `, meta ${m.meta}` : ""}`)
      .join("\n");
    const exemplos = [
      ...(ctx.exemplos_whatsapp ?? []).map(
        (c) => `[WhatsApp${c.titulo ? ` — ${c.titulo}` : ""}]\n${(c.mensagens ?? []).map((m) => `${m.autor}: ${m.texto}`).join("\n")}`,
      ),
      ...(ctx.exemplos_ligacao ?? []).map((c) => `[Ligação${c.titulo ? ` — ${c.titulo}` : ""}]\n${c.transcricao ?? ""}`),
    ].join("\n\n");
    const script = ctx.script_ligacao_atual;
    const scriptTexto = script
      ? [
          script.abertura ? `Abertura: ${script.abertura}` : "",
          script.qualificacao ? `Qualificação: ${script.qualificacao}` : "",
          script.apresentacao ? `Apresentação: ${script.apresentacao}` : "",
          script.fechamento ? `Fechamento: ${script.fechamento}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";
    const cronograma = (ctx.cronograma_followup_atual ?? [])
      .filter((c) => c.dia)
      .map((c) => `${c.dia} · ${c.canal ?? "-"} · ${c.objetivo ?? ""}`)
      .join("\n");

    const candidatos: Record<string, string | null | undefined> = {
      cliente: cliente.nome,
      segmento: cliente.segmento,
      consultorResponsavel: cliente.consultor_responsavel,
      processoAtual: processo.descricao,
      dores: dores || undefined,
      estrategiasExecutadas: estrategias || undefined,
      metricas: metricas || undefined,
      exemplosConversas: exemplos || undefined,
      scriptAtual: scriptTexto || undefined,
      cronogramaAtual: cronograma || undefined,
      observacoes: (ctx.observacoes ?? []).join(" "),
    };

    const novos: Record<string, string> = {};
    for (const [campo, valor] of Object.entries(candidatos)) {
      if (valor && !form[campo]?.trim()) {
        novos[campo] = valor;
        preenchidos.push(campo);
      }
    }
    if (Object.keys(novos).length) setForm((atual) => ({ ...atual, ...novos }));

    return { preenchidos };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.cliente?.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/treinamentos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao salvar");
      router.push(`/treinamento/${data.id}?gerar=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Novo treinamento</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--app-muted)" }}>
          Preencha o essencial ou suba o material bruto do cliente — a apresentação nunca inventa dado que não veio
          daqui.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-5">
        <Panel>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--app-muted)" }}>
            Material do cliente
          </h2>
          <p className="mb-5 text-xs" style={{ color: "var(--app-muted)" }}>
            Atalho recomendado: gere o briefing no Project do Claude do cliente (atas, protocolos, dados) e suba aqui
            — a IA organiza e preenche o formulário abaixo.
          </p>
          <ContextExtractor onExtract={aplicarContexto} />
        </Panel>

        <Panel>
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--app-muted)" }}>
            Dados do treinamento
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente *" value={form.cliente} onChange={set("cliente")} placeholder="Nome do cliente" />
            <Field label="Segmento" value={form.segmento} onChange={set("segmento")} placeholder="Ex.: clínicas odontológicas" />
            <Field label="Consultor(a) responsável" value={form.consultorResponsavel} onChange={set("consultorResponsavel")} />
            <Field label="Data do treinamento" value={form.dataTreinamento} onChange={set("dataTreinamento")} placeholder="DD/MM/AAAA" />
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--app-muted)" }}>
            Etapa 1 — Conexão
          </h2>
          <p className="mb-5 text-xs" style={{ color: "var(--app-muted)" }}>
            Processo atual (canais usados: WhatsApp, ligação, call) e as dores desse processo.
          </p>
          <div className="grid gap-4">
            <Area label="Processo atual" value={form.processoAtual} onChange={set("processoAtual")} placeholder="Como o time atende hoje, do primeiro contato ao fechamento." />
            <Area label="Dores (uma por linha)" value={form.dores} onChange={set("dores")} placeholder="Time perde o timing do follow-up&#10;Vendedor não sabe contornar objeção de preço" />
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--app-muted)" }}>
            Etapa 2 — Direcionamento tático
          </h2>
          <p className="mb-5 text-xs" style={{ color: "var(--app-muted)" }}>
            O que já foi executado e os indicadores (tempo de tela, taxa de conversão etc.).
          </p>
          <div className="grid gap-4">
            <Area label="Estratégias executadas" value={form.estrategiasExecutadas} onChange={set("estrategiasExecutadas")} placeholder="Uma por linha: nome — o que foi feito — resultado" />
            <Area label="Métricas / indicadores" value={form.metricas} onChange={set("metricas")} placeholder="Tempo de tela: 12min → meta 20min&#10;Taxa de conversão: 14% → meta 22%" />
          </div>
        </Panel>

        <Panel>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--app-muted)" }}>
            Etapa 3 — Treinamento tático
          </h2>
          <p className="mb-5 text-xs" style={{ color: "var(--app-muted)" }}>
            Cole trechos reais de conversa — são a base do roleplay interativo de WhatsApp e ligação.
          </p>
          <Area
            label="Exemplos reais de conversa (WhatsApp / ligação)"
            value={form.exemplosConversas}
            onChange={set("exemplosConversas")}
            placeholder="Cole trechos literais de conversas reais aqui."
          />
        </Panel>

        <Panel>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--app-muted)" }}>
            Material de apoio
          </h2>
          <p className="mb-5 text-xs" style={{ color: "var(--app-muted)" }}>
            Script de ligação e cronograma de follow-up já usados pelo cliente, se existirem — servem de base para o
            material final.
          </p>
          <div className="grid gap-4">
            <Area label="Script de ligação atual" value={form.scriptAtual} onChange={set("scriptAtual")} />
            <Area label="Cronograma de follow-up atual" value={form.cronogramaAtual} onChange={set("cronogramaAtual")} />
            <Area label="Observações e restrições" value={form.observacoes} onChange={set("observacoes")} placeholder="Algo que não deve aparecer no treinamento?" />
          </div>
        </Panel>

        {error ? (
          <p className="text-sm font-medium" style={{ color: "#ff6b6b" }}>
            {error}
          </p>
        ) : null}

        <div className="flex justify-end pb-8">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3.5 text-sm font-bold disabled:opacity-60"
            style={{ background: "var(--app-accent)", color: "#0a0a0a", borderRadius: "11px" }}
          >
            {loading ? "Salvando…" : "GERAR TREINAMENTO"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="field" value={value ?? ""} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea className="field" value={value ?? ""} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
