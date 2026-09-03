# 0006 — Mercado fracionário fora do universo

**Status:** aceito · **Data:** 2026-09-04

## Contexto

O portão de dados versionados, criado no bloco 2 da auditoria, reprovou na
primeira execução e expôs um defeito que a auditoria não tinha visto: **410 dos
1.120 tickers do universo não passavam pelo validador do próprio produto**. Duas
causas distintas, e esta decisão trata da segunda.

A primeira era um bug do validador, corrigido à parte: o regex exigia quatro
letras na raiz e rejeitava `B3SA3`, a ação da própria B3.

A segunda são **406 tickers com sufixo `F`, `B` ou `BF`** — o mercado
fracionário, onde o mesmo ativo é negociado em lote menor. A investigação
confirmou, com chamada direta à fonte:

```
{"stock":"BBAS3",  "name":"BCO BRASIL S.A.", "close":22.45, "volume":40886400, "market_cap":127300854512, "subsector":"Bancos Diversificados"}
{"stock":"BBAS3F", "name":"BCO BRASIL S.A.", "close":22.42, "volume":216281,   "market_cap":127300854512, "subsector":null}
```

Mesma empresa, mesmo valor de mercado, volume 189 vezes menor. A Brapi devolve
os dois em `/quote/list?type=stock`, com `type` e `subType` idênticos: **não há
campo que os distinga**, só o sufixo no ticker. Eles não são introduzidos pelo
nosso processo — chegam assim da fonte.

O efeito no produto era inteiramente indesejado, e nenhuma parte dele foi
projetada:

- a tabela mostrava a mesma empresa duas vezes, e buscar "BBAS" devolvia dois
  resultados para o mesmo banco;
- a coluna de volume exibia, na linha fracionária, um número que não representa
  a liquidez da empresa;
- o link da linha dava **404**, porque o validador rejeitava o ticker;
- a estrela de acompanhar não fazia nada, porque `toggle` valida e desiste em
  silêncio;
- o sitemap anunciava 406 URLs para páginas inexistentes.

## Decisão

**Tickers de mercado fracionário ficam fora do universo do V1.**

A exclusão acontece **no mapper**, na fronteira de normalização, e em nenhum
outro lugar. Tabela, busca, lista de acompanhamento e sitemap saem todos do
mesmo universo, então uma regra numa fronteira resolve os cinco sintomas — e
nenhuma condição precisa aparecer na interface.

O teste é o sufixo: um ticker canônico da B3 termina sempre em dígito de classe,
então **terminar em letra é suficiente** e não corre risco de excluir ativo
normal.

Universo depois da regra: **714 ativos — 377 ações e 337 FIIs**, contra 1.120
antes.

## Alternativas consideradas

- **Suportar os fracionários**, alargando o validador e servindo a página de
  detalhe. Rejeitada: a tabela continuaria duplicando cada empresa, e o produto
  passaria a ter duas linhas para o mesmo ativo sem nenhuma pergunta de usuário
  que isso responda. Havia ainda a dúvida não resolvida de se a cota grátis dá
  histórico para esses tickers — se não desse, o detalhe nasceria com a seção do
  gráfico permanentemente em erro.
- **Filtrar na consulta à fonte**, pedindo à Brapi que não os devolva. Não
  existe: a API não tem parâmetro para isso, e o `subType` é o mesmo.
- **Filtrar na interface**, escondendo as linhas na tabela. Rejeitada: espalharia
  a condição por tabela, busca, lista e sitemap, e cada esquecimento voltaria
  como linha morta.
- **Agrupar o fracionário sob o ativo principal**, mostrando os dois volumes.
  Rejeitada: é funcionalidade, não correção, e ninguém pediu essa pergunta.

## Trade-off aceito

Quem digitar `PETR4F` na busca não encontra nada. Aceitamos: é o mesmo ativo que
`PETR4`, que aparece normalmente, e o produto se propõe a mostrar como o mercado
está se comportando — não a espelhar cada mercado de negociação da B3.

## Consequência que não é do escopo desta decisão

Sobra **um** ativo listado que ainda não abre: `BRAX`, que a fonte devolve sem
dígito de classe. Não é fracionário e não entra nesta regra. Fica registrado
como caso conhecido, de uma linha, para decisão à parte.
