# Etapa 0 — o que a Brapi devolve de graça

Investigação da API antes de qualquer código, como manda a spec técnica §20.

**Executada em:** 2026-09-03 · **Plano:** Gratuito (confirmado pela própria
resposta da API) · **Método:** sondas HTTP com o token real em variável de
ambiente, lendo status, cabeçalhos de cota e forma do corpo.

**Veredito: go, com três cortes de escopo.** O produto é viável na cota grátis,
mas não do jeito que a spec assumia — a restrição real é outra, e é melhor.

> O token do autor **não** aparece neste documento nem em nenhum arquivo do
> repositório. Ver `docs/decisions/0007`.

---

## 1. A descoberta que reorganiza a arquitetura

A cota de 15.000/mês **não é consumida pelo endpoint que serve a tela
principal**. Medido, com o contador `x-ratelimit-remaining` lido antes e depois:

| Operação                                     | Custo em unidades da cota |
| -------------------------------------------- | ------------------------- |
| `/quote/list` (universo inteiro, 3 chamadas) | **0**                     |
| Cotação de ticker de amostra (PETR4, VALE3)  | **0**                     |
| Cotação de ticker comum (HGLG11)             | **1**                     |
| Histórico de ticker comum (1 chamada)        | **1**                     |

São dois orçamentos distintos, não um:

- **Rota de amostra e listagem** — 20 requisições/minuto, sem consumir a cota
  mensal. Cabeçalhos `ratelimit-limit: 20`, `ratelimit-reset: 60`. Estourar
  devolve `429` com `retry-after: 60` e corpo
  `{"error":true,"code":"RATE_LIMITED","message":"Limite do sandbox excedido…"}`.
- **Ticker comum** — 1 unidade por requisição, contra 15.000 por ciclo de
  faturamento. Cabeçalhos `x-ratelimit-limit: 15000`,
  `x-ratelimit-window: billing-cycle`.

**Consequência:** a tabela de mercado — a tela onde o avaliador decide — sai de
`/quote/list` e custa **zero** da cota mensal, limitada só a 20 req/min, que uma
revalidação de servidor nunca chega perto de encostar. A cota mensal passa a
ser gasta apenas por página de detalhe visitada.

Isso inverte a seção 8 da spec técnica: a decisão central deixa de ser
"frequência de revalidação da tabela" e passa a ser **"o que a tabela grátis
resolve e o que exige uma unidade de cota"**.

---

## 2. As cinco perguntas da spec técnica §20

### 1. Existe endpoint de listagem do universo? Sim.

`GET /quote/list` devolve, por ativo: `stock`, `name`, `close`, `change`,
`volume`, `market_cap`, `logo`, `sector`, `subsector`, `type`, `subType`.

Ou seja: **a tabela de mercado inteira, com preço e variação, em uma requisição
grátis.** É o achado mais valioso da manhã.

Tamanho real do universo, por `totalCount`:

| `type`  | Ativos  | Observação                                    |
| ------- | ------- | --------------------------------------------- |
| `stock` | **783** | `subType` `stock` e `unit`                    |
| `fund`  | **670** | inclui FII, ETF, FI-Agro, FI-Infra, FIP, FIDC |
| `bdr`   | 868     | fora do escopo do Mirante                     |

Dentro de `fund`, a distribuição de `subType` observada: `fii` 298, `etf` 178,
nulo 68, `fi-agro` 34, `fi-infra` 14, `fip` 11, `fidc` 1.

**Duas armadilhas medidas:**

- A chamada **sem filtro trunca em 2.000 itens** e não devolve metadado de
  paginação. Com 783 + 670 + 868 = 2.321 ativos, ela perde ~321 silenciosamente.
  A leitura correta é por `type`, com `limit` e `page` (`?type=stock&limit=500&page=2`
  devolveu 283 itens, `hasNextPage: false`, `totalCount: 783`).
- O `subType` é o campo que separa FII de ETF. Sem ele, "fundos" viram um saco
  de coisas diferentes.

**Impacto na spec:** o universo de ações + FIIs é de ~1.081 ativos (783 + 298),
não "algumas centenas". Medido em JSON: as 1.348 linhas de `stock` + `fund` da
resposta truncada pesam **316 KB** cruas e **105 KB** com os seis campos que a
tabela usa. Isso não invalida a decisão de não virtualizar da spec §7, mas
invalida o número que a sustentava — a decisão precisa ser retomada com estes
bytes e com INP medido, que é exatamente o que aquela seção prometeu fazer.

### 2. Histórico está incluso? Sim, mas raso.

Ranges liberados no plano Gratuito, dito pela própria API:
**`1d`, `5d`, `1mo`, `3mo`.**

- `1y` → `400 INVALID_RANGE`, exige plano Startup (R$ 119,99/mês).
- `5y` → `400 INVALID_RANGE`, exige plano Pro (R$ 139,99/mês).
- Candles com `date` (epoch em segundos), `open`, `high`, `low`, `close`,
  `volume`, `adjustedClose`. `3mo` diário = 64 candles, ~30 KB.
- Intervalos `1wk`, `1mo` e `60m` funcionam, mas não destravam range maior.

**Esta é a pergunta que a spec marcou como capaz de mudar o produto, e ela
mudou:** o seletor `1M · 3M · 6M · 1A · 5A` da spec técnica §3.2 não existe na
cota grátis. O que existe é `1D · 5D · 1M · 3M`.

Cuidado com a armadilha que quase me enganou: **os tickers de amostra respondem
`10y` sem cobrar nada**. Testar com PETR4 dá a impressão de que histórico longo
é grátis; qualquer FII ou ação fora da amostra responde `400`.

### 3. Dividendos estão inclusos? Não.

`?dividends=true` em ticker comum → `403 FEATURE_NOT_AVAILABLE`,
`feature: canAccessDividendsData`, plano Startup (R$ 119,99/mês). A resposta
inclui um `preview` com um pagamento de amostra, o que é ainda mais tentador e
igualmente inútil.

Mesma armadilha da amostra: PETR4 devolve 175 pagamentos de graça; HGLG11 e
MXRF11 devolvem 403.

**Impacto:** a seção de dividendos do detalhe não existe no V1 — e, pior para o
argumento de produto, **não há dividend yield nem P/VP para FII** na cota
grátis. `priceEarnings` e `earningsPerShare` vêm no básico, mas são métricas de
ação, não de FII. O registro `0008` precisa de emenda: a página de detalhe de um
FII mostra preço, variação e gráfico de 3 meses, igual à de uma ação.

### 4. Como a API sinaliza limite e bloqueio? Explicitamente, e bem.

| Situação                     | Status | `code`                         |
| ---------------------------- | ------ | ------------------------------ |
| Limite por minuto da amostra | 429    | `RATE_LIMITED` + `retry-after` |
| Recurso fora do plano        | 403    | `FEATURE_NOT_AVAILABLE`        |
| Range fora do plano          | 400    | `INVALID_RANGE`                |
| Mais de 1 ativo por chamada  | 400    | `QUOTES_PER_REQUEST_EXCEEDED`  |
| Ticker inexistente           | 404    | `NOT_FOUND`                    |

Todos os corpos são JSON com `error`, `message`, `code` — e `details` quando é
questão de plano. O `Result` do provider (spec §7) mapeia isso sem invenção:
`rate-limited` para 429, `not-found` para 404, `unavailable` para o resto.

**Bônus não previsto:** `x-ratelimit-remaining` permite ao servidor saber quanto
resta da cota **antes** de estourar. O estado de fallback pode ser preventivo em
vez de reativo, que é uma entrada melhor de case study do que a original.

### 5. Horário exato do pregão? Sim, da fonte primária.

Da B3, mercado a vista de ações — FIIs negociam na mesma sessão:

| Sessão              | Horário       |
| ------------------- | ------------- |
| Pré-abertura        | 09:30 – 09:45 |
| Negociação contínua | 10:00 – 16:55 |
| Call de fechamento  | 16:55 – 17:00 |

Fuso `America/Sao_Paulo`, sem horário de verão desde 2019, logo deslocamento
fixo de UTC−3.

Para `getMarketStatus`, "aberto" é **10:00 – 17:00 em dia útil sem feriado B3**.
O after-market existe mas fica fora do modelo: o dado da cota grátis não o
reflete de forma confiável, e o produto é de observação de fechamento.

Fonte: página de horários de negociação da B3
(`b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/horario-de-negociacao/acoes/`).
O calendário de feriados ainda precisa ser transcrito para o arquivo de dados
versionado — não inventar datas.

---

---

## 3. Restrição que não estava na lista: 1 ativo por requisição

`GET /quote/HGLG11,MXRF11,VISC11` → `400 QUOTES_PER_REQUEST_EXCEEDED`, "Seu
plano permite no máximo 1 ativo(s) por requisição". O plano Startup permite 10.

É a restrição mais consequente das cinco, e não estava na lista. Ela mata a
implementação óbvia da lista de acompanhamento (um lote com os tickers
acompanhados) — e a solução é a boa: **a lista lê preço de `/quote/list`**, que
já traz o mercado inteiro de graça. Uma requisição, zero de cota, qualquer
tamanho de lista.

---

## 4. O que muda na especificação

| Seção                      | Assumia                           | Medido                                        |
| -------------------------- | --------------------------------- | --------------------------------------------- |
| Técnica §3.2               | Seletor 1M · 3M · 6M · 1A · 5A    | Só `1D · 5D · 1M · 3M`                        |
| Técnica §3.2 / Produto §4  | Dividendos "se a cota permitir"   | Não permite. Seção sai                        |
| Técnica §8 / Produto §3    | Cota dirige revalidação da tabela | Tabela é grátis; cota é por página de detalhe |
| Técnica §7 (virtualização) | "Algumas centenas" de tickers     | ~1.081 ativos, 105 KB de JSON enxuto          |
| `0008` (FIIs)              | Métrica de FII no detalhe         | Sem DY e sem P/VP na cota grátis              |
| Técnica §7 (lote)          | `getQuotes(symbols[])`            | 1 ativo por requisição; lote vem da listagem  |

Nada disso é bloqueio. É a Etapa 0 fazendo exatamente o que devia: custar meia
manhã em vez de meia semana.

---

## 5. Decisão que não é minha

Duas rotas, e a diferença entre elas é dinheiro:

1. **Ficar no Gratuito e cortar.** Gráfico de até 3 meses, sem dividendos, sem
   DY de FII. O produto continua coerente — um mirante mostra o que se vê de
   onde se está — e a restrição vira a melhor página do case study, porque foi
   medida e não estimada.
2. **Startup, R$ 119,99/mês.** Destrava 1 ano de histórico, dividendos, DY, e
   10 ativos por requisição. O produto fica mais completo e passa a ter custo
   mensal recorrente por um artefato de portfólio.

Recomendação: **rota 1.** O que está sendo avaliado é como o produto se comporta
sob restrição real, e cortar com justificativa medida prova mais do que um
gráfico de cinco anos. Se um dia o produto tiver uso de verdade, o provider já
está pronto para o upgrade ser configuração.

A escolha vira um registro em `docs/decisions/` assim que o autor decidir.
