# 0002 — O que a cota grátis impõe ao código

**Status:** aceito · **Data:** 2026-09-03

Aplica no código a decisão `0010` do repositório do portfólio (ficar no plano
Gratuito) e a medição da Etapa 0. Existe aqui porque quem abre este repositório
precisa entender por que o produto tem quatro períodos e não cinco.

## Contexto

Medido contra a API real, no plano Gratuito:

| Recurso                         | Situação                                 |
| ------------------------------- | ---------------------------------------- |
| Listagem do universo            | Livre, e **não consome a cota mensal**   |
| Séries `1d`, `5d`, `1mo`, `3mo` | Livres, 1 unidade de cota por requisição |
| Séries `1y` e `5y`              | Plano pago                               |
| Dividendos, DY, P/VP            | Plano pago                               |
| Mais de um ativo por requisição | Plano pago                               |

## Decisão

O código reflete a restrição, sem prometer o que não pode entregar:

- `HISTORY_RANGES` tem exatamente `1d`, `5d`, `1mo`, `3mo`, e o tipo
  `HistoryRange` deriva dessa constante. Um período novo não entra por engano:
  entra mudando a lista, e o compilador aponta cada lugar afetado.
- Não existe seção de dividendos, e a página de detalhe de FII mostra o mesmo
  que a de uma ação. `/sobre` diz isso em uma frase.
- A revalidação segue o custo: universo a 60 s (grátis), série diária uma vez
  por dia — candle diário não muda no meio do pregão.
- `quota-exhausted` é um motivo de falha próprio, e o provider troca para o
  fallback **antes** de estourar, lendo `x-ratelimit-remaining`. Fallback
  preventivo em vez de reativo só é possível porque a fonte informa o saldo.
- `FEATURE_NOT_AVAILABLE` e `INVALID_RANGE` viram `unavailable`: recurso de
  plano pago é indisponibilidade da fonte, não erro de quem visita. Nenhuma tela
  do produto menciona plano de terceiro.

## Alternativas consideradas

- **Assinar o plano Startup.** Rejeitada no `0010` do portfólio: custo mensal
  recorrente por um artefato de avaliação.
- **Deixar `1y` e `5y` no seletor, mostrando erro ao clicar.** Rejeitada:
  oferecer o que não funciona é pior que não oferecer. O seletor só tem o que
  responde.
- **Estimar dividend yield a partir do histórico de preço.** Rejeitada: número
  inventado com aparência de dado, no domínio em que isso é mais grave.
- **Acumular fechamentos diários para o histórico crescer sozinho.** Guardada
  como caminho futuro; exige rotina agendada e armazenamento, que é
  infraestrutura que ainda não serve a ninguém.

## Trade-off aceito

O gráfico mostra três meses, e FII não tem a métrica que mais importa para FII.
É perda real de valor de produto. Em troca: custo zero, nenhuma assinatura, e
uma restrição medida — que o produto declara em vez de disfarçar.
