'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { WATCHLIST_STORAGE_KEY } from '@/lib/constants';
import { isValidSymbol, normalizeSymbol } from '@/lib/market/provider';

/**
 * A lista de acompanhamento é o único estado que é local de verdade: não tem
 * conta, não sai do navegador, e isso é dito em `/sobre`.
 *
 * `localStorage` é um store externo ao React, então quem lê é
 * `useSyncExternalStore` — não um efeito que chama `setState`. A diferença não é
 * estilo: é o que dá renderização no servidor sem divergência de hidratação
 * (`getServerSnapshot`), sincronia entre abas e uma leitura só por mudança.
 *
 * Toda leitura é defensiva: `localStorage` lança em navegador com dados de site
 * bloqueados, e o conteúdo pode ter sido editado à mão.
 */

const EMPTY: readonly string[] = Object.freeze([]);

/** Evento próprio: `storage` só dispara em outras abas, não na que escreveu. */
const CHANGE_EVENT = 'mirante:watchlist-change';

/**
 * `getSnapshot` precisa devolver a **mesma referência** enquanto o valor não
 * muda, senão o React re-renderiza sem parar. O cache compara a string crua.
 */
let cache: { raw: string | null; value: readonly string[] } = { raw: null, value: EMPTY };

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): readonly string[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const clean = parsed.filter(
      (item): item is string => typeof item === 'string' && isValidSymbol(item),
    );
    return clean.length === 0 ? EMPTY : clean;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): readonly string[] {
  const raw = readRaw();
  if (raw === cache.raw) return cache.value;
  cache = { raw, value: parse(raw) };
  return cache.value;
}

function getServerSnapshot(): readonly string[] {
  return EMPTY;
}

function subscribe(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === WATCHLIST_STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', handleStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function persist(symbols: readonly string[]): void {
  try {
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(symbols));
  } catch {
    // Armazenamento indisponível: a lista vale só para esta sessão. Sem alarme.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export interface WatchlistApi {
  readonly symbols: readonly string[];
  /**
   * Falso no HTML do servidor e no primeiro render do cliente. A UI usa isso
   * para não afirmar "lista vazia" antes de ter lido o armazenamento.
   */
  readonly hydrated: boolean;
  /**
   * Verdadeiro depois da primeira alteração feita nesta sessão — marcar,
   * desmarcar ou adotar uma lista recebida.
   *
   * É o que decide a precedência entre a lista local e a lista da URL
   * (docs/decisions/0004): antes de editar, um `?ativos` recebido é estado
   * inicial e a tela mostra o que o link trouxe; depois de editar, a lista local
   * manda e a URL passa a ser escrita a partir dela.
   *
   * Vive em memória de propósito: é sobre a sessão, não sobre a lista. Guardar
   * isso no navegador faria a segunda visita se comportar como uma edição.
   */
  readonly edited: boolean;
  readonly has: (symbol: string) => boolean;
  readonly toggle: (symbol: string) => void;
  readonly remove: (symbol: string) => void;
  readonly replaceAll: (symbols: readonly string[]) => void;
}

export function useWatchlist(): WatchlistApi {
  const symbols = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [edited, setEdited] = useState(false);

  const toggle = useCallback((raw: string) => {
    const symbol = normalizeSymbol(raw);
    if (!isValidSymbol(symbol)) return;
    const current = getSnapshot();
    setEdited(true);
    persist(
      current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol],
    );
  }, []);

  const remove = useCallback((raw: string) => {
    const symbol = normalizeSymbol(raw);
    setEdited(true);
    persist(getSnapshot().filter((item) => item !== symbol));
  }, []);

  const replaceAll = useCallback((next: readonly string[]) => {
    const clean = next.map(normalizeSymbol).filter(isValidSymbol);
    setEdited(true);
    persist([...new Set(clean)]);
  }, []);

  const has = useCallback((raw: string) => symbols.includes(normalizeSymbol(raw)), [symbols]);

  return { symbols, hydrated, edited, has, toggle, remove, replaceAll };
}
