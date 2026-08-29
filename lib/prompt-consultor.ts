/**
 * Prompt pronto para colar no Project do Claude que já tem o material do
 * cliente (atas, protocolos, dados, conversas). Pede para o Claude gerar
 * DOIS arquivos .txt para download, em vez de escrever tudo na conversa —
 * mais rápido, gasta menos tokens, e dá certinho com os dois uploads deste
 * app (ver ContextExtractor.tsx), que analisa um arquivo de cada vez.
 */
export const PROMPT_CONSULTOR = `Preciso que você organize as informações deste cliente para eu montar um
treinamento comercial para a equipe dele. Use TUDO que já está neste projeto
(atas de reunião, protocolos, dados de desempenho, prints ou transcrições de
conversas no WhatsApp, transcrições de ligação). NÃO invente nada: se uma
informação não existir no material deste projeto, deixe em branco ou escreva
"não informado".

IMPORTANTE — não escreva esse conteúdo na conversa. Gere DIRETAMENTE DOIS
ARQUIVOS .txt para eu baixar (use a ferramenta de criar arquivo), um para
cada bloco abaixo. Não repita o conteúdo dos arquivos na mensagem de resposta
— isso só gasta tokens à toa. Se quiser, confirme em uma frase curta que os
dois arquivos foram gerados.

PORTUGUÊS CORRETO, SEMPRE (norma culta, padrão ABNT): acentuação e cedilha
completas — "não", "é", "conversão", "atenção", "serviço" — nunca sem o
acento ou a cedilha, em nenhum dos dois arquivos.

ESTILO DE ESCRITA — MODO CAVEMAN (economiza espaço, cada caractere conta):
Nos campos que você redige (diagnóstico, processo, dores, resultado, script),
escreva frase curta, direta, sem conector ("portanto", "além disso", "de modo
que"), sem repetir contexto já dito, sem enrolação. Informação completa,
palavra mínima.
  Ruim: "O time atualmente enfrenta dificuldade significativa para realizar
  o acompanhamento adequado dos leads após o primeiro contato, o que acaba
  gerando perda de oportunidades de venda."
  Bom:  "Time perde lead sem follow-up após 1º contato."
EXCEÇÃO: trechos reais de conversa (seção 7) ficam LITERAIS — são
transcrição, não redação sua, não aplique o estilo caveman neles.

LIMITE DE TAMANHO — cada um dos dois arquivos abaixo será lido por um sistema
com teto de 24.000 caracteres por arquivo (o que passar disso é cortado e
perdido). Escreva direto ao ponto pra caber tudo dentro do limite. Se sobrar
espaço, use pra mais dado real (mais exemplo, mais número) — nunca pra
enrolação.

--------------------------------------------------------------------------
ARQUIVO 1 — nome sugerido: diagnostico-[nome do cliente].txt
--------------------------------------------------------------------------
1) CLIENTE
- Nome do cliente / empresa:
- Segmento:
- Ticket médio (se houver):
- Consultor(a) responsável:

2) PROCESSO COMERCIAL ATUAL
- Quais canais o time usa para atender lead? (whatsapp, ligacao, call, email, presencial)
- Descreva o processo atual em um parágrafo (do primeiro contato até o fechamento):
- Ferramentas usadas (CRM, agenda, etc.):

3) DORES DO PROCESSO COMERCIAL (não dores do produto — dores de VENDA)
Liste cada dor com um título curto e o detalhe, com base no que já apareceu
em reuniões ou dados:
- Dor 1:
- Dor 2:
- Dor 3:

4) MÉTRICAS / INDICADORES
Todo número de desempenho comercial disponível (não invente nenhum):
- Tempo de tela com as pessoas: atual e meta, se houver
- Taxa de conversão: atual e meta, se houver
- Outros indicadores relevantes (número de leads, taxa de resposta, ticket médio etc.)

5) RESTRIÇÕES E OBSERVAÇÕES
- Algo que NÃO deve aparecer no treinamento?
- Alguma observação importante sobre este cliente?

--------------------------------------------------------------------------
ARQUIVO 2 — nome sugerido: execucao-[nome do cliente].txt
--------------------------------------------------------------------------
6) ESTRATÉGIAS JÁ EXECUTADAS
Para cada ação que a Pulso ou o próprio cliente já tentou:
- Nome da estratégia | o que foi feito | resultado observado

7) EXEMPLOS REAIS DE CONVERSA (essencial para o roleplay do treinamento)
Cole trechos literais — não resuma:
- Trechos de conversas reais no WhatsApp (consultor e cliente, na ordem em que aconteceram)
- Trechos de transcrição de ligação real, se houver

8) SCRIPT DE LIGAÇÃO JÁ USADO (se existir)
- Abertura:
- Qualificação:
- Apresentação:
- Objeções mais comuns e como o time costuma responder:
- Fechamento:

9) CRONOGRAMA DE FOLLOW-UP JÁ USADO (se existir)
- Dia | canal | objetivo | mensagem de exemplo

--------------------------------------------------------------------------

Depois que eu revisar os dois arquivos, vou subir cada um no lugar certo do
gerador de treinamentos da Pulso (arquivo 1 no upload "Diagnóstico", arquivo
2 no upload "Execução e exemplos"), que lê e monta a apresentação
automaticamente.`;
