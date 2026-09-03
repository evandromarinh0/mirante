'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WATCHLIST_QUERY_KEY } from '@/lib/constants';
import { parseWatchlistParam, sameWatchlist, toWatchlistParam } from '@/lib/market/watchlist-url';
import { useWatchlistContext } from './watchlist-provider';

/**
 * Reconcilia a URL com o armazenamento local — o ponto mais sutil da lista.
 *
 * A lista mora no navegador (não há conta), mas a **visão** vem da URL, para
 * poder ser renderizada no servidor e enviada por link. Duas fontes obrigam a
 * decidir quem manda, e a decisão está em `docs/decisions/0004`:
 *
 * **A lista local ganha a partir do momento em que a pessoa edita.** Um
 * `?ativos` recebido é estado inicial — uma lista importada —, não fonte
 * persistente de verdade.
 *
 * Em três situações:
 *
 * - **Editou** → a URL é reescrita a partir da lista local, sempre. Desmarcar
 *   um ativo que veio no link o remove de verdade, em vez de ele sobreviver
 *   porque continua escrito na URL.
 * - **Não editou e a URL não traz lista** → escreve a lista local na URL, para
 *   que o servidor renderize as linhas.
 * - **Não editou e a URL traz lista diferente** → a tela mostra o que o link
 *   trouxe e oferece adotar. Nada é sobrescrito sem clique.
 *
 * Todas as escritas usam `replace`: sincronizar não é navegação, e voltar no
 * histórico não deve desfazer uma sincronização.
 */
export function WatchlistSync() {
  const router = useRouter();
  const params = useSearchParams();
  const { symbols, hydrated, edited, replaceAll } = useWatchlistContext();

  const shared = params.get(WATCHLIST_QUERY_KEY);
  const sharedSymbols = parseWatchlistParam(shared ?? undefined);
  const localParam = toWatchlistParam(symbols);

  useEffect(() => {
    if (!hydrated) return;

    // Depois de editar, a lista local é a verdade: a URL a segue.
    if (edited) {
      if (shared !== localParam) {
        router.replace(localParam ? `/lista?${WATCHLIST_QUERY_KEY}=${localParam}` : '/lista', {
          scroll: false,
        });
      }
      return;
    }

    // Antes de editar, a URL só é preenchida quando está sem lista nenhuma.
    if (shared === null && symbols.length > 0) {
      router.replace(`/lista?${WATCHLIST_QUERY_KEY}=${localParam}`, { scroll: false });
    }
  }, [edited, hydrated, localParam, router, shared, symbols.length]);

  /**
   * O aviso é sobre uma lista **importada** que ainda não foi adotada. Depois de
   * editar ele não faz sentido: a tela passou a mostrar a lista da pessoa, e
   * dizer que ela "veio de um link" seria falso.
   *
   * A comparação é por conjunto, não por string concatenada — ordem de
   * marcação não faz duas listas iguais serem diferentes.
   */
  const showImportOffer =
    hydrated && !edited && sharedSymbols.length > 0 && !sameWatchlist(sharedSymbols, symbols);

  if (!showImportOffer) return null;

  return (
    <aside
      role="note"
      className="border-border bg-bg-subtle flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm"
    >
      <p className="text-text-secondary">
        Esta lista veio de um link compartilhado, e é diferente da sua.
      </p>
      <button
        type="button"
        onClick={() => replaceAll(sharedSymbols)}
        className="border-border-strong text-text hover:bg-surface hit-area inline-flex items-center rounded-md border px-3 text-sm font-medium"
      >
        Adotar esta lista
      </button>
    </aside>
  );
}
