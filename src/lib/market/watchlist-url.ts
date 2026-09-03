import { isValidSymbol, normalizeSymbol } from './provider';

/**
 * A lista de acompanhamento na URL.
 *
 * Existe como módulo puro porque a mesma regra é aplicada em dois lugares: a
 * página do servidor, que renderiza as linhas, e o componente de cliente, que
 * reconcilia a URL com o armazenamento local. Enquanto a regra estava duplicada
 * nos dois, eles divergiram — e a divergência era o bug: um lado comparava
 * ordem de inserção, o outro ordem alfabética.
 */

/** `?ativos=HGLG11,MXRF11` — entrada de terceiro, então valida e deduplica. */
export function parseWatchlistParam(
  raw: string | readonly string[] | undefined,
): readonly string[] {
  // `Array.isArray` não estreita array somente-leitura, então o tipo é dito aqui.
  const value: string = typeof raw === 'string' ? raw : (raw?.[0] ?? '');
  const symbols = value.split(',').map(normalizeSymbol).filter(isValidSymbol);

  return [...new Set(symbols)];
}

export function toWatchlistParam(symbols: readonly string[]): string {
  return [...new Set(symbols.map(normalizeSymbol).filter(isValidSymbol))].join(',');
}

/**
 * Duas listas são a mesma lista quando têm os mesmos ativos — **a ordem não
 * conta**. Quem marca HGLG11 e depois ADSH11 tem a mesma lista de quem marcou
 * na ordem inversa, e comparar as strings concatenadas dizia o contrário.
 */
export function sameWatchlist(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a.map(normalizeSymbol));
  const right = new Set(b.map(normalizeSymbol));

  if (left.size !== right.size) return false;
  for (const symbol of left) {
    if (!right.has(symbol)) return false;
  }
  return true;
}
