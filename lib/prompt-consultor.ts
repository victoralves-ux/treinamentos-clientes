/**
 * Prompt pronto para colar no Project do Claude que ja tem o material do
 * cliente (atas, protocolos, dados, conversas). Pede para o Claude gerar
 * DOIS arquivos .txt para download, em vez de escrever tudo na conversa —
 * mais rapido, gasta menos tokens, e da certinho com os dois uploads deste
 * app (ver ContextExtractor.tsx), que analisa um arquivo de cada vez.
 */
export const PROMPT_CONSULTOR = `Preciso que voce organize as informacoes deste cliente para eu montar um
treinamento comercial para a equipe dele. Use TUDO que ja esta neste projeto
(atas de reuniao, protocolos, dados de desempenho, prints ou transcricoes de
conversas no WhatsApp, transcricoes de ligacao). NAO invente nada: se uma
informacao nao existir no material deste projeto, deixe em branco ou escreva
"não informado".

IMPORTANTE — nao escreva esse conteudo na conversa. Gere DIRETAMENTE DOIS
ARQUIVOS .txt para eu baixar (use a ferramenta de criar arquivo), um para
cada bloco abaixo. Não repita o conteúdo dos arquivos na mensagem de resposta
— isso só gasta tokens à toa. Se quiser, confirme em uma frase curta que os
dois arquivos foram gerados.

ESTILO DE ESCRITA — MODO CAVEMAN (economiza espaço, cada caractere conta):
Nos campos que voce redige (diagnostico, processo, dores, resultado, script),
escreva frase curta, direta, sem conector ("portanto", "alem disso", "de modo
que"), sem repetir contexto ja dito, sem enrolacao. Informacao completa,
palavra minima.
  Ruim: "O time atualmente enfrenta dificuldade significativa para realizar
  o acompanhamento adequado dos leads apos o primeiro contato, o que acaba
  gerando perda de oportunidades de venda."
  Bom:  "Time perde lead sem follow-up apos 1o contato."
EXCECAO: trechos reais de conversa (secao 7) ficam LITERAIS — sao
transcricao, nao redacao sua, nao aplique o estilo caveman neles.

LIMITE DE TAMANHO — cada um dos dois arquivos abaixo sera lido por um sistema
com teto de 24.000 caracteres por arquivo (o que passar disso e cortado e
perdido). Escreva direto ao ponto pra caber tudo dentro do limite. Se sobrar
espaco, use pra mais dado real (mais exemplo, mais numero) — nunca pra
enrolacao.

--------------------------------------------------------------------------
ARQUIVO 1 — nome sugerido: diagnostico-[nome do cliente].txt
--------------------------------------------------------------------------
1) CLIENTE
- Nome do cliente / empresa:
- Segmento:
- Ticket medio (se houver):
- Consultor(a) responsavel:

2) PROCESSO COMERCIAL ATUAL
- Quais canais o time usa para atender lead? (whatsapp, ligacao, call, email, presencial)
- Descreva o processo atual em um paragrafo (do primeiro contato ate o fechamento):
- Ferramentas usadas (CRM, agenda, etc.):

3) DORES DO PROCESSO COMERCIAL (nao dores do produto — dores de VENDA)
Liste cada dor com um titulo curto e o detalhe, com base no que ja apareceu
em reunioes ou dados:
- Dor 1:
- Dor 2:
- Dor 3:

4) METRICAS / INDICADORES
Todo numero de desempenho comercial disponivel (nao invente nenhum):
- Tempo de tela com as pessoas: atual e meta, se houver
- Taxa de conversao: atual e meta, se houver
- Outros indicadores relevantes (numero de leads, taxa de resposta, ticket medio etc.)

5) RESTRICOES E OBSERVACOES
- Algo que NAO deve aparecer no treinamento?
- Alguma observacao importante sobre este cliente?

--------------------------------------------------------------------------
ARQUIVO 2 — nome sugerido: execucao-[nome do cliente].txt
--------------------------------------------------------------------------
6) ESTRATEGIAS JA EXECUTADAS
Para cada acao que a Pulso ou o proprio cliente ja tentou:
- Nome da estrategia | o que foi feito | resultado observado

7) EXEMPLOS REAIS DE CONVERSA (essencial para o roleplay do treinamento)
Cole trechos literais — nao resuma:
- Trechos de conversas reais no WhatsApp (consultor e cliente, na ordem em que aconteceram)
- Trechos de transcricao de ligacao real, se houver

8) SCRIPT DE LIGACAO JA USADO (se existir)
- Abertura:
- Qualificacao:
- Apresentacao:
- Objecoes mais comuns e como o time costuma responder:
- Fechamento:

9) CRONOGRAMA DE FOLLOW-UP JA USADO (se existir)
- Dia | canal | objetivo | mensagem de exemplo

--------------------------------------------------------------------------

Depois que eu revisar os dois arquivos, vou subir cada um no lugar certo do
gerador de treinamentos da Pulso (arquivo 1 no upload "Diagnóstico", arquivo
2 no upload "Execução e exemplos"), que le e monta a apresentacao
automaticamente.`;
