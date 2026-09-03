'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useWatchlist, type WatchlistApi } from '@/lib/hooks/use-watchlist';

/**
 * Uma instância de estado para a tela inteira.
 *
 * Sem isto, cada botão de acompanhar da tabela teria o próprio `useWatchlist` —
 * cinquenta leituras de `localStorage` e cinquenta ouvintes de evento por
 * render, com estados que divergem entre si. O contexto é o que torna a tabela
 * server-rendered compatível com um estado que só existe no cliente.
 */

const WatchlistContext = createContext<WatchlistApi | null>(null);

export function WatchlistProvider({ children }: { readonly children: ReactNode }) {
  const api = useWatchlist();
  return <WatchlistContext.Provider value={api}>{children}</WatchlistContext.Provider>;
}

export function useWatchlistContext(): WatchlistApi {
  const api = useContext(WatchlistContext);
  if (!api) throw new Error('useWatchlistContext exige WatchlistProvider acima na árvore.');
  return api;
}
