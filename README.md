# Treinamentos Clientes

Plataforma cloud para gerar apresentações de treinamento comercial para clientes da Pulso:
login → dashboard → formulário (ou upload de material bruto) → gerar → apresentar → exportar.
Segue o mesmo padrão do `gerador-sites` e do `gerador-criativos`.

**Sites publicados:** `https://<seu-projeto>.vercel.app/t/<slug>`

## Arquitetura

| Camada | Escolha |
| --- | --- |
| App + API | Next.js 16 (App Router) na **Vercel** |
| Banco | **Supabase** PostgreSQL com RLS (projeto próprio, não compartilhado com os outros geradores) |
| Login | **Supabase Auth** (e-mail + senha, domínio restrito) |
| IA | Gemini ou Anthropic (chave em variável de ambiente) |
| Apresentação publicada | rota dinâmica `/t/<slug>` do próprio app |
| Exportação | `.pptx` gerado no servidor com `pptxgenjs` (editável na hora, arquivo leve) |

O agente **não gera HTML solto**: ele preenche um contrato tipado (`TreinamentoSpec`, zod) que a
camada de componentes React transforma em apresentação, e o mesmo contrato alimenta o exportador de
`.pptx`. A identidade visual (preto e vermelho da Pulso) é **fixa** — não há tema por cliente, ao
contrário do gerador de sites.

```
Formulário / material bruto → Briefing estruturado (contexto) → Plano (escopo) → Conteúdo (3 etapas)
                                                                  └── POST /plan ──┘ └── POST /build ──┘
```

A geração roda em **duas requisições**: funções serverless têm teto de 60s no plano Hobby da Vercel.
A camada de IA (`lib/ai.ts`) faz retry com backoff e cai para um modelo alternativo quando o
principal responde 503 (sobrecarga).

## As 3 etapas da apresentação

1. **Conexão** — processo atual do cliente (WhatsApp, ligação, call) e as dores desse processo.
2. **Direcionamento tático** — estratégias já executadas e indicadores (tempo de tela, taxa de
   conversão etc.).
3. **Treinamento tático** — roleplay interativo: simulação de conversa no WhatsApp (chat real,
   mensagem por mensagem) e simulação de ligação (roteiro navegável por etapa).

Depois das 3 etapas, a apresentação publicada mostra o **material de apoio**: script de ligação
completo e cronograma de cadência de follow-up com exemplos de reativação — e o botão para baixar
tudo em `.pptx`.

## De onde vem o conteúdo

Tudo que entra na apresentação vem de um briefing estruturado (`lib/context.ts`), extraído por IA de
material bruto do cliente — atas de reunião, protocolos internos, trechos reais de conversa no
WhatsApp, transcrições de ligação. A regra é a mesma dos outros geradores da Pulso: **nunca
inventar**. Sem informação no material, o campo fica vazio.

O jeito recomendado de preparar esse material: copiar o prompt em `lib/prompt-consultor.ts` (também
disponível para copiar/baixar direto na tela de "Novo treinamento") e colar no **Project do Claude**
do cliente, que já tem atas, protocolos e dados carregados. A resposta vira o arquivo `.txt` que é
enviado no formulário.

## Setup

### 1. Supabase

1. Crie um **novo** projeto em [supabase.com](https://supabase.com) — não reaproveite o projeto do
   `gerador-sites` ou do `gerador-criativos`, por design (veja o cabeçalho de `supabase/schema.sql`).
2. SQL Editor → cole e execute `supabase/schema.sql`. Isso cria as tabelas, RLS e triggers.
3. Project Settings → API: copie `URL`, `anon key` e `service_role key`.
4. Authentication → Providers → Email: para uso interno, desative "Confirm email" (login imediato).
5. Depois de criar sua conta, promova-se a administrador:
   ```sql
   update profiles set role = 'admin' where email = 'voce@usepulso.org';
   ```

### 2. Variáveis de ambiente

Veja `.env.example`. Resumo:

```
ANTHROPIC_API_KEY=          # ou GEMINI_API_KEY
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ALLOWED_EMAIL_DOMAINS=usepulso.org
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
```

`SUPABASE_SERVICE_ROLE_KEY` e as chaves de IA **nunca** aparecem no cliente — só rodam no servidor.

### 3. Local

```bash
npm install
npm run dev
```

### 4. Deploy na Vercel

```bash
npx vercel
npx vercel --prod
```

Ou `bash deploy.sh` (lê `.env.local` e envia as variáveis para os 3 ambientes da Vercel antes do
deploy). Configure as mesmas variáveis em Project Settings → Environment Variables se preferir o
deploy automático a cada push.

## Estrutura

| Caminho | Função |
| --- | --- |
| `app/login` | Login e criação de conta |
| `app/page.tsx` | Dashboard com filtros |
| `app/novo` | Formulário do cliente + upload de material bruto |
| `app/treinamento/[id]` | Geração (SSE) e resultado |
| `app/t/[slug]` | Apresentação publicada (modo tela cheia, sem login) |
| `app/t/[slug]/export` | Download público do `.pptx` |
| `lib/context.ts` | Extração do briefing a partir do material bruto |
| `lib/schema.ts` | Contrato tipado da apresentação (`TreinamentoSpec`) |
| `lib/pipeline.ts` | Orquestração da geração (plano → conteúdo → validação) |
| `lib/pptx.ts` | Exportação para `.pptx` |
| `components/treinamento/` | Renderização das 3 etapas, incluindo os simuladores de WhatsApp e ligação |

## Fora do escopo desta fase

Editor pós-geração (como o do `gerador-sites`), upload de imagens/logo do cliente — a identidade
visual é sempre a da Pulso, fixa — e domínio próprio. A modelagem já comporta um editor futuro:
bastaria adicionar uma tabela de versões, como em `gerador-sites`.
