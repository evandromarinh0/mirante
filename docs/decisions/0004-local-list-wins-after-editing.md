# 0004 — A lista local ganha a partir da primeira edição

**Status:** aceito · **Data:** 2026-09-04

## Contexto

A lista de acompanhamento tem duas fontes, e isso não é acidente: ela mora no
`localStorage` porque não há conta, e a **visão** vem da URL porque precisa ser
renderizada no servidor e enviada por link.

Duas fontes obrigam a decidir quem manda. A primeira implementação não decidiu:
a URL renderizava as linhas e o armazenamento só era consultado para desenhar as
estrelas. O resultado apareceu na auditoria como o achado A1 — **desmarcar um
ativo não removia a linha**, porque o ativo continuava escrito na URL. Quem
recebia a lista `VALE3, ITSA4, BBAS3` e desmarcava ITSA4 continuava vendo ITSA4,
e ainda era avisado de que a lista "veio de um link compartilhado".

## Decisão

**A lista local passa a ter precedência a partir do momento em que a pessoa
edita.** Um `?ativos` recebido é **estado inicial — uma lista importada** —, e
não fonte persistente de verdade.

Três situações, e nada além delas:

| Situação                                     | Quem manda                                         |
| -------------------------------------------- | -------------------------------------------------- |
| Editou nesta sessão                          | **A lista local.** A URL é reescrita a partir dela |
| Não editou, URL sem `?ativos`                | A lista local é escrita na URL                     |
| Não editou, URL com lista diferente da local | A URL mostra as linhas e oferece adotar            |

O exemplo do enunciado passa a valer literalmente: recebida a lista
`VALE3, ITSA4, BBAS3`, desmarcar ITSA4 produz `VALE3, BBAS3` — na tela, na URL e
no armazenamento.

O sinal de "editou" vive **em memória**, na sessão, e não no navegador: ele é
sobre o que aconteceu desde que a página abriu, não sobre a lista. Guardá-lo
junto da lista faria a segunda visita se comportar como uma edição, e um link
recebido nunca mais seria importável.

Toda escrita de URL usa `replace`. Sincronizar não é navegação, e voltar no
histórico não deve desfazer uma sincronização.

## Consequência que vale enunciar

Tocar numa estrela enquanto se pré-visualiza a lista de outra pessoa **também**
troca a visão para a sua. Não é efeito colateral: é a mesma regra. Adicionar um
ativo é editar, e a partir daí a tela mostra a lista de quem está editando.

Consideramos suavizar isso e decidimos não: a alternativa seria mesclar a lista
recebida com a local, que é um terceiro estado que ninguém pediu e que nenhuma
das duas pessoas reconheceria como "sua lista".

## Alternativas consideradas

- **A URL sempre manda.** É o que existia. Rejeitada: torna a edição sem efeito
  visível, que é o defeito de interação mais básico que existe.
- **A lista local sempre manda, inclusive antes de editar.** Rejeitada: quem
  abre um link compartilhado veria a própria lista, e a lista recebida
  desapareceria antes de poder ser lida. O link deixaria de servir para
  compartilhar.
- **Mesclar as duas listas ao receber um link.** Rejeitada: produz uma lista que
  nem quem enviou nem quem recebeu reconhece, e não há caminho de volta.
- **Persistir o sinal de edição no navegador.** Rejeitada: a segunda visita
  passaria a se comportar como edição em curso, e um link recebido nunca mais
  seria importável.

## Trade-off aceito

O modelo tem dois regimes na mesma tela — antes e depois de editar —, e isso é
mais difícil de explicar do que "a URL manda". Aceitamos porque é o único modelo
em que as duas coisas que a lista precisa fazer continuam funcionando: ser
editável sem conta e ser compartilhável por link.

## Verificação

Coberto por e2e nos seis fluxos: importar, desmarcar um importado, adicionar
depois de importar, alterar a lista, recarregar depois da alteração, e o aviso
aparecendo só quando faz sentido. A regra de comparação por conjunto tem teste
unitário próprio em `watchlist-url`.
