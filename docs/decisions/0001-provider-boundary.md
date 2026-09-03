# 0001 — A fronteira de dados, e o lint que a mantém

**Status:** aceito · **Data:** 2026-09-03

Continua o registro `0007` do repositório do portfólio, que decidiu a fronteira.
Este registra como ela ficou implementada, e o que a implementação mudou na
decisão original.

## Contexto

A decisão de esconder a fonte atrás de uma interface é fácil de escrever e fácil
de furar. Basta um `fetch('https://brapi.dev/...')` dentro de uma página, ou um
componente importando o provider "só para esse caso", e o desacoplamento vira
comentário em documento.

A Etapa 0 também mediu duas restrições que a interface original não previa:

- a cota grátis aceita **um ativo por requisição**;
- a listagem do universo devolve preço, variação e volume de **todos** os ativos
  sem consumir a cota mensal.

## Decisão

### O caminho, em uma direção

```
UI → serviço → MarketDataProvider → fonte
```

Três regras, todas **verificadas por ESLint** com `no-restricted-imports`:

1. Página e componente não importam provider.
2. Componente também não importa a camada de serviço: quem busca é o Server
   Component da página; componente recebe por prop.
3. Nada fora de `src/lib/market/providers/` sabe que a Brapi existe.

A terceira é sustentada por algo além da regra de import: **nome de campo de
terceiro morre no mapper**. `market_cap`, `subType` e `historicalDataPrice` não
atravessam a fronteira; do lado de cá existem `Instrument`, `Candle` e `Series`.
Interface com tipo de terceiro dentro não desacopla nada.

### Duas operações, não quatro

A interface tem `listUniverse()` e `getHistory()`. O `0007` previa também
`getQuotes(symbols[])` e `getQuote(symbol)`; a medição eliminou os dois:

- lote não existe na fonte grátis (um ativo por requisição), e a lista de
  acompanhamento resolve filtrando o universo já carregado — uma requisição,
  zero de cota, qualquer tamanho de lista;
- cotação individual seria redundante com a listagem e custaria uma unidade de
  cota para devolver o que já temos de graça.

Método de interface que existe "para o caso de", em interface com uma
implementação de produção, é adivinhação. Dois métodos cobrem o produto inteiro.

### Falha esperada é valor

`Result<T>` com `origin` no sucesso e `reason` na falha. Só bug lança. O `origin`
carrega provider, instante da consulta e se é fallback — é o que permite a tela
dizer de quando é o dado sem que cada página invente seu próprio jeito.

## Alternativas consideradas

- **Chamar a fonte direto das páginas.** Rejeitada: economiza meio dia e cobra
  uma reescrita quando a política da API mudar — risco de alta probabilidade na
  spec de produto.
- **Só documentar a fronteira.** Rejeitada: fronteira documentada é fronteira
  que vaza na primeira pressa. A regra de lint custou dez linhas.
- **Repassar o tipo da API como tipo de domínio.** Rejeitada: é o vazamento
  disfarçado de economia, e faria mudança de contrato da API virar mudança de
  componente.
- **Camada genérica com registro de adaptadores e cache próprio.** Rejeitada:
  abstração para um caso de uso. Três implementações e um resolvedor bastam.

## Trade-off aceito

Uma indireção a mais entre página e dado, e duas regras de lint que reprovam
atalhos que às vezes seriam convenientes. Em troca, `FixtureProvider` faz teste
e preview rodarem sem rede e sem cota, `SnapshotProvider` sustenta o requisito de
nunca mostrar tela de erro, e trocar de fonte é configuração.
