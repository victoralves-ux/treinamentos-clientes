/** Etapas do pipeline. Arquivo separado para poder ser importado no cliente. */
export type StepId = "analise" | "escopo" | "conteudo" | "montagem" | "validacao" | "publicacao";

export const STEPS: { id: StepId; label: string }[] = [
  { id: "analise", label: "Briefing analisado" },
  { id: "escopo", label: "Escopo do treinamento definido" },
  { id: "conteudo", label: "Conteúdo das 3 etapas escrito" },
  { id: "montagem", label: "Apresentação montada" },
  { id: "validacao", label: "Apresentação validada" },
  { id: "publicacao", label: "Apresentação publicada" },
];
