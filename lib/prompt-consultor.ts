/**
 * Prompt pronto para colar no Project do Claude que ja tem o material do
 * cliente (atas, protocolos, dados, conversas). Ele pede ao Claude para
 * organizar tudo no formato que o extrator deste app entende — o consultor
 * so precisa copiar a resposta e colar aqui (ou fazer download como .txt e
 * subir o arquivo).
 */
export const PROMPT_CONSULTOR = `Preciso que voce organize as informacoes deste cliente para eu montar um
treinamento comercial para a equipe dele. Use TUDO que ja esta neste projeto
(atas de reuniao, protocolos, dados de desempenho, prints ou transcricoes de
conversas no WhatsApp, transcricoes de ligacao) e responda preenchendo os
campos abaixo. NAO invente nada: se uma informacao nao existir no material
deste projeto, deixe o campo em branco ou escreva "não informado".

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

4) ESTRATEGIAS JA EXECUTADAS
Para cada acao que a Pulso ou o proprio cliente ja tentou:
- Nome da estrategia | o que foi feito | resultado observado

5) METRICAS / INDICADORES
Todo numero de desempenho comercial disponivel (nao invente nenhum):
- Tempo de tela com as pessoas: atual e meta, se houver
- Taxa de conversao: atual e meta, se houver
- Outros indicadores relevantes (numero de leads, taxa de resposta, ticket medio etc.)

6) EXEMPLOS REAIS DE CONVERSA (essencial para o roleplay do treinamento)
Cole trechos literais — nao resuma:
- Trechos de conversas reais no WhatsApp (consultor e cliente, na ordem em que aconteceram)
- Trechos de transcricao de ligacao real, se houver

7) SCRIPT DE LIGACAO JA USADO (se existir)
- Abertura:
- Qualificacao:
- Apresentacao:
- Objecoes mais comuns e como o time costuma responder:
- Fechamento:

8) CRONOGRAMA DE FOLLOW-UP JA USADO (se existir)
- Dia | canal | objetivo | mensagem de exemplo

9) RESTRICOES E OBSERVACOES
- Algo que NAO deve aparecer no treinamento?
- Alguma observacao importante sobre este cliente?

Responda em texto corrido, organizado exatamente nesta ordem de secoes (1 a 9).
Depois que eu revisar, vou salvar sua resposta como .txt e subir no gerador de
treinamentos da Pulso, que le esse texto e monta a apresentacao automaticamente.`;
