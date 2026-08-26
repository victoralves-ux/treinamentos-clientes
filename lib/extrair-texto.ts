import "server-only";

/**
 * Extrai texto legivel dos formatos que o consultor costuma ter em maos.
 * PDF fica de fora de proposito: exigiria uma dependencia pesada e o consultor
 * consegue exportar o mesmo conteudo em .docx ou .txt.
 */

export const FORMATOS_ACEITOS = ".txt,.md,.docx,.rtf";
export const TAMANHO_MAXIMO = 5 * 1024 * 1024;

/** Teto de caracteres enviados a IA, para a extracao caber no tempo da funcao. */
export const MAX_CARACTERES = 24_000;

function limparXml(xml: string) {
  return xml
    // Quebras de paragrafo e de linha do Word viram quebras de verdade.
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function lerDocx(buffer: ArrayBuffer) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);
  const documento = zip.file("word/document.xml");
  if (!documento) throw new Error("Arquivo .docx sem conteúdo legível.");
  return limparXml(await documento.async("string"));
}

function lerRtf(texto: string) {
  return texto
    .replace(/\\par[d]?/g, "\n")
    .replace(/\{\\\*?[^{}]*\}/g, "")
    .replace(/\\[a-z]+-?\d*\s?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface TextoExtraido {
  texto: string;
  caracteres: number;
  truncado: boolean;
}

export async function extrairTexto(file: File): Promise<TextoExtraido> {
  const nome = file.name.toLowerCase();

  let bruto: string;
  if (nome.endsWith(".docx")) {
    bruto = await lerDocx(await file.arrayBuffer());
  } else if (nome.endsWith(".rtf")) {
    bruto = lerRtf(await file.text());
  } else if (nome.endsWith(".txt") || nome.endsWith(".md")) {
    bruto = await file.text();
  } else if (nome.endsWith(".doc")) {
    throw new Error("O formato .doc antigo não é suportado. Salve como .docx ou .txt.");
  } else if (nome.endsWith(".pdf")) {
    throw new Error("PDF não é suportado. Exporte o conteúdo como .docx ou .txt.");
  } else {
    throw new Error("Formato não suportado. Envie .txt, .md, .docx ou .rtf.");
  }

  const limpo = bruto.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
  return {
    texto: limpo.slice(0, MAX_CARACTERES),
    caracteres: limpo.length,
    truncado: limpo.length > MAX_CARACTERES,
  };
}
