'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WATCHLIST_QUERY_KEY } from '@/lib/constants';
import { parseWatchlistParam, sameWatchlist, toWatchlistParam } from '@/lib/market/watchlist-url';
import { useWatchlistContext } from './watchlist-provider';

/**
 * Reconcilia a URL com o armazenamento local — o ponto mais sutil da lista.
 *
 * A lista é local (não há conta), mas a **visão** é da URL, para poder ser
 * renderizada no servidor e enviada por link. Isso obriga a decidir quem manda
 * em cada caso, e é aqui que fica essa decisão:
 *
 * - URL sem `?ativos` e lista guardada → escreve a URL com `replace`, sem criar
 *   entrada no histórico (voltar não deve desfazer uma sincronização).
 * - URL com `?ativos` diferente do guardado → a URL ganha a tela, e quem chegou
 *   pelo link decide se adota a lista. Nada é sobrescrito sem clique.
 */
export function WatchlistSync() {
  const router = useRouter();
  const params = useSearchParams();
  const { symbols, hydrated, replaceAll } = useWatchlistContext();
  const [adopted, setAdopted] = useState(false);

  const shared = params.get(WATCHLIST_QUERY_KEY);
  const sharedSymbols = parseWatchlistParam(shared ?? undefined);

  useEffect(() => {
    if (!hydrated) return;
    if (shared !== null) return;
    if (symbols.length === 0) return;
    router.replace(`/lista?${WATCHLIST_QUERY_KEY}=${toWatchlistParam(symbols)}`, { scroll: false });
  }, [hydrated, router, shared, symbols]);

  /**
   * Comparação por conjunto, não por string concatenada. A versão anterior
   * comparava a ordem da URL com a lista ordenada alfabeticamente, então duas
   * listas idênticas em ordem diferente eram declaradas diferentes — e a pessoa
   * era avisada de que a própria lista tinha vindo de um link de outra pessoa.
   */
  const differs = sharedSymbols.length > 0 && !sameWatchlist(sharedSymbols, symbols);

  if (!hydrated || !differs || adopted) return null;

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
        onClick={() => {
          replaceAll(sharedSymbols);
          setAdopted(true);
        }}
        className="border-border-strong text-text hover:bg-surface hit-area inline-flex items-center rounded-md border px-3 text-sm font-medium"
      >
        Adotar esta lista
      </button>
    </aside>
  );
}
