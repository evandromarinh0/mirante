import type { Route } from 'next';
import type { Instrument, InstrumentKind } from './types';

/**
 * A URL é a fonte de verdade da tabela: busca, filtro e ordenação.
 *
 * Consequências que são o ponto, não efeito colateral: recarregar preserva a
 * tela, voltar funciona, e qualquer visão é compartilhável por link. Por isso
 * estas funções são puras e não dependem de React — a página do servidor as usa
 * para renderizar a visão já filtrada, sem JavaScript no cliente.
 */

export const SORT_COLUMNS = ['symbol', 'name', 'price', 'changePercent', 'volume'] as const;
export type SortColumn = (typeof SORT_COLUMNS)[number];

export type SortDirection = 'asc' | 'desc';
export type KindFilter = 'all' | InstrumentKind;

export interface TableState {
  readonly query: string;
  readonly kind: KindFilter;
  readonly sort: SortColumn;
  readonly direction: SortDirection;
}

export const DEFAULT_TABLE_STATE: TableState = {
  query: '',
  kind: 'all',
  sort: 'volume',
  direction: 'desc',
};

/** Nomes de parâmetro em português: a URL é parte da interface. */
export const PARAM = {
  query: 'busca',
  kind: 'tipo',
  sort: 'ordem',
  direction: 'sentido',
} as const;

const KIND_PARAM_VALUES: Record<string, KindFilter> = {
  acoes: 'stock',
  fiis: 'reit',
  tudo: 'all',
};

const KIND_TO_PARAM: Record<KindFilter, string> = {
  stock: 'acoes',
  reit: 'fiis',
  all: 'tudo',
};

export type RawSearchParams = Record<string, string | readonly string[] | undefined>;

function first(value: string | readonly string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : (value as string | undefined);
}

export function parseTableState(params: RawSearchParams): TableState {
  const rawSort = first(params[PARAM.sort]);
  const rawDirection = first(params[PARAM.direction]);
  const rawKind = first(params[PARAM.kind]);

  const sort = (SORT_COLUMNS as readonly string[]).includes(rawSort ?? '')
    ? (rawSort as SortColumn)
    : DEFAULT_TABLE_STATE.sort;

  return {
    query: (first(params[PARAM.query]) ?? '').trim().slice(0, 32),
    kind:
      rawKind !== undefined && rawKind in KIND_PARAM_VALUES ? KIND_PARAM_VALUES[rawKind]! : 'all',
    sort,
    direction:
      rawDirection === 'asc' || rawDirection === 'desc' ? rawDirection : defaultDirection(sort),
  };
}

/** Texto ordena crescente; número ordena decrescente. É o que se espera. */
export function defaultDirection(column: SortColumn): SortDirection {
  return column === 'symbol' || column === 'name' ? 'asc' : 'desc';
}

/** Serializa só o que difere do padrão: URL curta e compartilhável. */
export function toSearchParams(state: TableState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.query) params.set(PARAM.query, state.query);
  if (state.kind !== 'all') params.set(PARAM.kind, KIND_TO_PARAM[state.kind]);
  if (state.sort !== DEFAULT_TABLE_STATE.sort) params.set(PARAM.sort, state.sort);
  if (state.direction !== defaultDirection(state.sort)) {
    params.set(PARAM.direction, state.direction);
  }
  return params;
}

/**
 * `keep` preserva parâmetros que não são da tabela — a lista compartilhada vive
 * em `?ativos`, e ordenar não pode descartá-la.
 */
export function tableHref(
  state: TableState,
  pathname = '/',
  keep: Readonly<Record<string, string>> = {},
): Route {
  const params = toSearchParams(state);
  for (const [key, value] of Object.entries(keep)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  // As rotas tipadas do Next não verificam string montada; a garantia aqui vem
  // de `pathname` ser sempre literal na chamada e o resto ser query string.
  return (query ? `${pathname}?${query}` : pathname) as Route;
}

/** Clicar na coluna ordenada inverte o sentido; em outra, começa pelo padrão. */
export function toggleSort(state: TableState, column: SortColumn): TableState {
  if (state.sort !== column) return { ...state, sort: column, direction: defaultDirection(column) };
  return { ...state, direction: state.direction === 'asc' ? 'desc' : 'asc' };
}

function compare(a: Instrument, b: Instrument, column: SortColumn): number {
  switch (column) {
    case 'symbol':
      return a.symbol.localeCompare(b.symbol, 'pt-BR');
    case 'name':
      return a.name.localeCompare(b.name, 'pt-BR');
    case 'price':
      return a.price - b.price;
    case 'changePercent':
      return a.changePercent - b.changePercent;
    case 'volume':
      return a.volume - b.volume;
  }
}

export function applyTableState(
  instruments: readonly Instrument[],
  state: TableState,
): readonly Instrument[] {
  const needle = state.query.toLocaleUpperCase('pt-BR');

  const filtered = instruments.filter((instrument) => {
    if (state.kind !== 'all' && instrument.kind !== state.kind) return false;
    if (!needle) return true;
    return (
      instrument.symbol.includes(needle) ||
      instrument.name.toLocaleUpperCase('pt-BR').includes(needle)
    );
  });

  const factor = state.direction === 'asc' ? 1 : -1;
  // `toSorted` mantém a entrada intacta: a lista vem de cache compartilhado.
  return filtered.toSorted((a, b) => compare(a, b, state.sort) * factor);
}

/** Qual filtro zerou o resultado — o estado vazio precisa dizer isso. */
export function emptyCause(state: TableState): 'query' | 'kind' | 'both' | null {
  const hasQuery = state.query.length > 0;
  const hasKind = state.kind !== 'all';
  if (hasQuery && hasKind) return 'both';
  if (hasQuery) return 'query';
  if (hasKind) return 'kind';
  return null;
}
