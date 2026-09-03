# 0003 — Filtrar e paginar no servidor, não no cliente

**Status:** aceito · **Data:** 2026-09-04

## Contexto

O universo capturado tem **1.120 ativos** (783 ações e 337 FIIs). A home mostra
uma página de 50. Faltavam duas coisas: chegar ao resto do universo, e filtrar
sem esperar uma navegação inteira a cada tecla.

A tentação óbvia é mandar o universo todo para o navegador e filtrar lá: fica
instantâneo, sem servidor no caminho. Medido, o universo enxuto (os seis campos
que a tabela usa) pesa **105 KB de JSON**, ~30 KB comprimido.

A spec técnica §7 já havia decidido não virtualizar a tabela, com o argumento de
que "algumas centenas de linhas cabem em um payload". A Etapa 0 mostrou que são
mais de mil, então aquele número morreu e a decisão precisava ser retomada — foi
o que esta faz.

## Decisão

**O servidor filtra, ordena e pagina. O cliente nunca recebe o universo.**

- `paginate()` recorta a página; o número dela vive na URL, em `?pagina=`, como
  o resto do estado. Buscar, filtrar ou reordenar volta para a página 1 —
  continuar na página 7 de um resultado que encolheu não significa nada.
- Página fora do intervalo é corrigida para a última, não devolve tabela vazia:
  o número vem da URL, que é entrada de terceiro.
- A busca instantânea é **navegação com transição**, não filtragem local: cada
  pausa de 250 ms na digitação faz `router.replace` dentro de
  `startTransition`. A tabela anterior fica na tela enquanto a nova chega, com
  um indicador discreto — nunca volta ao esqueleto.
- Sem JavaScript, o `<form method="get">` e os links de paginação continuam
  funcionando. A melhoria é progressiva; o mecanismo é o mesmo.

## Alternativas consideradas

- **Mandar o universo e filtrar no cliente.** Rejeitada por dois motivos, e o
  segundo é o que decide. O primeiro: 30 KB comprimidos em toda visita à home,
  para uma tela em que a maioria vai buscar um ticker e sair. O segundo:
  **duplicaria a filtragem** — a mesma regra em `applyTableState` no servidor e
  outra no cliente, que é como se produz "a contagem diz 40 e a lista mostra
  38".
- **Filtrar só a página visível no cliente.** Rejeitada: é a versão que parece
  instantânea e mente. Mostrar "3 resultados" quando o universo tem 30 é pior
  do que 250 ms de espera.
- **Virtualizar a tabela inteira no cliente.** Rejeitada: exige mandar tudo (o
  problema acima), quebra Ctrl+F, complica leitor de tela e resolve um problema
  que a paginação já resolve.
- **Rolagem infinita.** Rejeitada: sem posição estável na URL, não dá para
  compartilhar nem voltar para onde se estava, e é justamente a propriedade que
  a URL como fonte de verdade existe para garantir.
- **Índice reduzido (só ticker e nome) carregado sob demanda para um
  typeahead.** Não rejeitada — **adiada**. É a única forma honesta de sugestão
  instantânea, custa ~12 KB comprimidos e só carregaria ao focar o campo. Entra
  se a busca por navegação se mostrar lenta com dado de produção; hoje seria
  otimizar antes de medir.

## Trade-off aceito

Digitar tem latência de rede: ~250 ms de debounce mais o tempo do servidor.
Aceitamos porque a alternativa instantânea ou mente sobre a contagem ou paga
payload em toda visita, e porque a resposta vem de cache de servidor sem
consumir cota — o mesmo motivo que faz a tabela ser grátis.

A latência fica visível e honesta: o indicador "atualizando" aparece, e o
conteúdo antigo permanece legível até o novo chegar.
