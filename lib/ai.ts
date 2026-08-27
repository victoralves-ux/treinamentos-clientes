/**
 * Camada unica de acesso a IA. Aceita Anthropic ou Gemini e sempre
 * devolve JSON ja parseado. Se as duas chaves existirem, Anthropic vence.
 */

export type Provider = "anthropic" | "gemini";

/**
 * Tetos por tentativa. A funcao serverless e morta aos 60s sem rodar nenhum
 * catch, entao o orcamento total termina antes disso. A resposta normal leva de 5s a 26s (a mesma chamada e
 * ~3x mais lenta a partir da regiao da Vercel), mas uma em cada tres trava e
 * nunca responde. A primeira tentativa espera o suficiente para o caso lento
 * legitimo; a segunda e curta, porque so existe para o caso travado - e usa o
 * modelo alternativo, que responde mais rapido.
 */
/*
 * Medicao com o mesmo prompt: 3.7-flash 3s, flash-lite 5s, 3.5-flash 15s.
 * O modo de falha da API gratuita nao e lentidao: e um 503 que so chega depois
 * de ~43s, segurando a conexao. Por isso o teto e curto - desistir cedo e
 * tentar outro modelo sai mais barato do que esperar o 503 chegar.
 */
const CALL_TIMEOUTS_MS = [18_000, 14_000, 12_000];
const BUDGET_MS = 50_000;

// Anthropic so tem um modelo na lista (sem fallback pra outro), entao uma
// tentativa que estourou o timeout nao vale repetir com o orcamento que
// sobrou - vai travar de novo. Mas um JSON malformado (aspas nao escapadas
// em texto real, por exemplo) costuma vir de uma resposta RAPIDA, e nesse
// caso sobra tempo de sobra pra tentar de novo - daí a segunda entrada.
const ANTHROPIC_CALL_TIMEOUTS_MS = [55_000, 25_000];
const ANTHROPIC_BUDGET_MS = 58_000;

const tetoDaTentativa = (i: number, timeouts: number[] = CALL_TIMEOUTS_MS) =>
  timeouts[Math.min(i, timeouts.length - 1)];

/**
 * Dois perfis de modelo. O planejamento e uma resposta curta e vale usar o
 * modelo mais capaz; a redacao do conteudo e longa e precisa ser rapida, senao
 * estoura o limite da funcao. Medicoes com o mesmo prompt:
 * 3.7-flash 31s, 3.5-flash 28s, 3.1-flash-lite 15s.
 */
const GEMINI_MODELS = {
  plano: [process.env.GEMINI_MODEL || "gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash"],
  conteudo: [process.env.GEMINI_MODEL_FAST || "gemini-3.1-flash-lite", "gemini-3.7-flash", "gemini-3.5-flash"],
};

export type Perfil = keyof typeof GEMINI_MODELS;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** JSON malformado. Vale nova tentativa: costuma sair correto na segunda. */
class ParseError extends Error {}

export function activeProvider(): Provider | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

/**
 * Erro mais comum de modelo gerando JSON com texto real dentro (conversa de
 * WhatsApp, por exemplo): escrever uma quebra de linha literal dentro de uma
 * string em vez de "\n" escapado, o que quebra o JSON.parse na hora. Percorre
 * o texto sabendo quando esta dentro de uma string (respeitando escapes) e
 * so escapa ali dentro.
 */
function escapeRawNewlinesInStrings(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === "\\") {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else if (ch === "\n") {
        out += "\\n";
      } else if (ch === "\r") {
        out += "\\r";
      } else if (ch === "\t") {
        out += "\\t";
      } else {
        out += ch;
      }
    } else {
      if (ch === '"') inString = true;
      out += ch;
    }
  }
  return out;
}

function extractJson(text: string): unknown {
  const trimmed = escapeRawNewlinesInStrings(
    text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim(),
  );
  try {
    return JSON.parse(trimmed);
  } catch (primeiroErro) {
    // Modelos as vezes escrevem uma frase antes do objeto: recorta do primeiro
    // "{" ate o ultimo "}" e tenta de novo.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) {
      console.error("[extractJson] JSON invalido, sem chaves. Texto:\n", text.slice(0, 4000));
      throw new ParseError("A IA não devolveu JSON válido.");
    }
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch (err) {
      console.error(
        "[extractJson] JSON invalido. Erro 1:",
        primeiroErro instanceof Error ? primeiroErro.message : primeiroErro,
        "Erro 2:",
        err instanceof Error ? err.message : err,
        "\nTexto (ate 6000 chars):\n",
        trimmed.slice(0, 6000),
      );
      throw new ParseError(err instanceof Error ? err.message : "JSON inválido");
    }
  }
}

async function callAnthropic(system: string, user: string, maxTokens: number, model: string, tetoMs: number) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(tetoMs),
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      // Modelos recentes (claude-sonnet-5 e a familia 4.6+) rejeitam prefill
      // de mensagem do assistente ("a conversa precisa terminar com uma
      // mensagem do usuario"). O system prompt ja instrui a responder so com
      // JSON; extractJson cobre o caso de sobrar markdown ou texto em volta.
      messages: [{ role: "user", content: user }],
      // Sonnet 5 pensa (thinking adaptativo) por padrao, o que adiciona
      // latencia sem necessidade aqui: e so extracao/preenchimento de JSON
      // estruturado, sem raciocinio agentic. Desligar reduz o tempo de
      // resposta bem abaixo do teto da funcao serverless.
      thinking: { type: "disabled" },
    }),
  });
  if (!res.ok) throw new HttpError(res.status, `Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = json.content.map((c) => c.text ?? "").join("");
  return extractJson(text);
}

async function callGemini(system: string, user: string, maxTokens: number, model: string, tetoMs: number) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(tetoMs),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: maxTokens,
          temperature: 0.8,
          // O raciocinio interno consumia ~2.700 tokens e dobrava a latencia
          // (28s viravam 47s), estourando o limite da funcao serverless.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );
  if (!res.ok) throw new HttpError(res.status, `Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini devolveu resposta vazia.");
  return extractJson(text);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryable(err: unknown) {
  if (err instanceof ParseError) return true;
  if (err instanceof HttpError) return [429, 500, 502, 503, 504].includes(err.status);
  // Timeout do AbortSignal ou falha de rede: vale tentar de novo.
  return err instanceof Error && /timeout|abort|fetch failed|network/i.test(err.message);
}

/**
 * Chama a IA e devolve JSON. Modelos generativos ficam sobrecarregados com
 * alguma frequencia (503), entao insistimos com backoff e, se necessario,
 * caimos para um modelo alternativo. O orcamento total cabe no limite de
 * 60s da funcao serverless.
 */
export async function generateJson(
  system: string,
  user: string,
  maxTokens = 12000,
  perfil: Perfil = "plano",
): Promise<unknown> {
  const provider = activeProvider();
  if (!provider) throw new Error("Nenhuma chave de IA configurada (ANTHROPIC_API_KEY ou GEMINI_API_KEY).");

  const models =
    provider === "anthropic"
      ? [process.env.ANTHROPIC_MODEL || "claude-sonnet-5"]
      : GEMINI_MODELS[perfil].filter((m, i, a) => a.indexOf(m) === i);

  const timeouts = provider === "anthropic" ? ANTHROPIC_CALL_TIMEOUTS_MS : CALL_TIMEOUTS_MS;
  const budget = provider === "anthropic" ? ANTHROPIC_BUDGET_MS : BUDGET_MS;
  const tentativas = provider === "anthropic" ? ANTHROPIC_CALL_TIMEOUTS_MS.length : 4;

  const started = Date.now();
  let lastError: unknown;

  for (let attempt = 0; attempt < tentativas; attempt++) {
    // Alterna o modelo a cada tentativa: quando um esta instavel, o proximo
    // costuma responder na hora.
    const model = models[attempt % models.length];
    try {
      const teto = tetoDaTentativa(attempt, timeouts);
      return provider === "anthropic"
        ? await callAnthropic(system, user, maxTokens, model, teto)
        : await callGemini(system, user, maxTokens, model, teto);
    } catch (err) {
      lastError = err;
      const restante = budget - (Date.now() - started);
      if (!retryable(err) || restante < tetoDaTentativa(attempt + 1, timeouts)) break;
      // Espera curta: o objetivo e trocar de modelo, nao aguardar recuperacao.
      await sleep(Math.min(600, restante / 4));
    }
  }

  if (lastError instanceof HttpError && [429, 503].includes(lastError.status)) {
    throw new Error("O modelo de IA está sobrecarregado no momento. Tente gerar novamente em alguns instantes.");
  }
  if (lastError instanceof Error && /timeout|abort/i.test(lastError.message)) {
    throw new Error("O modelo de IA demorou demais para responder. Tente gerar novamente.");
  }
  if (lastError instanceof ParseError) {
    throw new Error("A IA devolveu uma resposta em formato inválido. Tente gerar novamente.");
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
