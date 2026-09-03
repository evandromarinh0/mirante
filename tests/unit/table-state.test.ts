import { describe, expect, it } from 'vitest';
import {
  applyTableState,
  DEFAULT_TABLE_STATE,
  emptyCause,
  parseTableState,
  paginate,
  tableHref,
  toggleSort,
} from '@/lib/market/table-state';
import type { Instrument } from '@/lib/market/types';

/**
 * A URL é a fonte de verdade, então ela é contrato: um link compartilhado hoje
 * tem de reproduzir a mesma visão amanhã. Estes testes existem para que mudar
 * nome de parâmetro seja uma decisão, não um acidente.
 */

const instrument = (over: Partial<Instrument> & Pick<Instrument, 'symbol'>): Instrument => ({
  name: over.symbol,
  kind: 'stock',
  price: 10,
  change: 0,
  changePercent: 0,
  volume: 0,
  sector: null,
  ...over,
});

const universe: readonly Instrument[] = [
  instrument({
    symbol: 'PETR4',
    name: 'PETROBRAS PN',
    price: 48.2,
    changePercent: 2.8,
    volume: 500,
  }),
  instrument({ symbol: 'VALE3', name: 'VALE ON', price: 61.5, changePercent: -1.2, volume: 900 }),
  instrument({ symbol: 'HGLG11', kind: 'reit', price: 147.8, changePercent: 0.56, volume: 130 }),
  instrument({ symbol: 'MXRF11', kind: 'reit', price: 9.4, changePercent: -0.3, volume: 700 }),
];

describe('parseTableState', () => {
  it('cai no padrão quando não há parâmetro', () => {
    expect(parseTableState({})).toEqual(DEFAULT_TABLE_STATE);
  });

  it('lê busca, classe, coluna e sentido', () => {
    expect(
      parseTableState({ busca: ' petr ', tipo: 'fiis', ordem: 'price', sentido: 'asc' }),
    ).toEqual({ query: 'petr', kind: 'reit', sort: 'price', direction: 'asc', page: 1 });
  });

  it('ignora parâmetro inválido em vez de quebrar', () => {
    const state = parseTableState({ ordem: 'sql', tipo: 'cripto', sentido: 'sim' });
    expect(state.sort).toBe(DEFAULT_TABLE_STATE.sort);
    expect(state.kind).toBe('all');
    expect(state.direction).toBe('desc');
  });

  it('limita o tamanho da busca', () => {
    expect(parseTableState({ busca: 'x'.repeat(80) }).query).toHaveLength(32);
  });

  it('aceita parâmetro repetido usando o primeiro valor', () => {
    expect(parseTableState({ tipo: ['acoes', 'fiis'] }).kind).toBe('stock');
  });
});

describe('tableHref', () => {
  it('omite o que é padrão, para o link ficar curto', () => {
    expect(tableHref(DEFAULT_TABLE_STATE)).toBe('/');
  });

  it('serializa só o que difere do padrão', () => {
    expect(tableHref({ ...DEFAULT_TABLE_STATE, kind: 'reit' })).toBe('/?tipo=fiis');
  });

  it('preserva parâmetros que não são da tabela', () => {
    const href = tableHref({ ...DEFAULT_TABLE_STATE, sort: 'price' }, '/lista', {
      ativos: 'HGLG11,MXRF11',
    });
    expect(href).toContain('ordem=price');
    expect(href).toContain('ativos=HGLG11%2CMXRF11');
  });

  it('sobrevive à ida e volta', () => {
    const state = {
      query: 'vale',
      kind: 'stock' as const,
      sort: 'name' as const,
      direction: 'desc' as const,
      page: 3,
    };
    const url = new URL(tableHref(state), 'https://example.com');
    expect(parseTableState(Object.fromEntries(url.searchParams))).toEqual(state);
  });
});

describe('toggleSort', () => {
  it('inverte o sentido na coluna já ordenada', () => {
    const state = { ...DEFAULT_TABLE_STATE, sort: 'volume' as const, direction: 'desc' as const };
    expect(toggleSort(state, 'volume').direction).toBe('asc');
  });

  it('usa o padrão da coluna ao trocar de coluna', () => {
    const next = toggleSort(DEFAULT_TABLE_STATE, 'symbol');
    expect(next).toMatchObject({ sort: 'symbol', direction: 'asc' });
  });
});

describe('applyTableState', () => {
  it('filtra por classe', () => {
    const rows = applyTableState(universe, { ...DEFAULT_TABLE_STATE, kind: 'reit' });
    expect(rows.map((row) => row.symbol)).toEqual(['MXRF11', 'HGLG11']);
  });

  it('busca por código e por nome, sem diferenciar caixa', () => {
    expect(applyTableState(universe, { ...DEFAULT_TABLE_STATE, query: 'petr' })).toHaveLength(1);
    expect(applyTableState(universe, { ...DEFAULT_TABLE_STATE, query: 'vale on' })).toHaveLength(1);
  });

  it('ordena por variação, decrescente', () => {
    const rows = applyTableState(universe, {
      ...DEFAULT_TABLE_STATE,
      sort: 'changePercent',
      direction: 'desc',
    });
    expect(rows[0]?.symbol).toBe('PETR4');
    expect(rows.at(-1)?.symbol).toBe('VALE3');
  });

  it('não altera a lista de entrada', () => {
    const before = universe.map((row) => row.symbol);
    applyTableState(universe, { ...DEFAULT_TABLE_STATE, sort: 'symbol', direction: 'asc' });
    expect(universe.map((row) => row.symbol)).toEqual(before);
  });
});

describe('emptyCause', () => {
  it('diz qual filtro zerou o resultado', () => {
    expect(emptyCause(DEFAULT_TABLE_STATE)).toBeNull();
    expect(emptyCause({ ...DEFAULT_TABLE_STATE, query: 'x' })).toBe('query');
    expect(emptyCause({ ...DEFAULT_TABLE_STATE, kind: 'reit' })).toBe('kind');
    expect(emptyCause({ ...DEFAULT_TABLE_STATE, kind: 'reit', query: 'x' })).toBe('both');
  });
});

describe('paginação', () => {
  const rows = Array.from({ length: 120 }, (_, index) => index);

  it('recorta a página pedida', () => {
    const page = paginate(rows, 2, 50);
    expect(page.rows).toHaveLength(50);
    expect(page.rows[0]).toBe(50);
    expect(page.firstIndex).toBe(51);
    expect(page.lastIndex).toBe(100);
    expect(page.totalPages).toBe(3);
  });

  it('a última página pode ser parcial', () => {
    const page = paginate(rows, 3, 50);
    expect(page.rows).toHaveLength(20);
    expect(page.lastIndex).toBe(120);
  });

  it('corrige página fora do intervalo em vez de devolver vazio', () => {
    // O número vem da URL, que é entrada de terceiro: página 99 mostra a última.
    expect(paginate(rows, 99, 50).page).toBe(3);
    expect(paginate(rows, -4, 50).page).toBe(1);
  });

  it('lida com lista vazia sem gerar página zero', () => {
    const page = paginate([], 1, 50);
    expect(page.totalPages).toBe(1);
    expect(page.firstIndex).toBe(0);
    expect(page.total).toBe(0);
  });

  it('a página entra na URL só a partir da segunda', () => {
    expect(tableHref({ ...DEFAULT_TABLE_STATE, page: 1 })).toBe('/');
    expect(tableHref({ ...DEFAULT_TABLE_STATE, page: 4 })).toBe('/?pagina=4');
  });

  it('reordenar volta para a primeira página', () => {
    const onPageSeven = { ...DEFAULT_TABLE_STATE, page: 7 };
    expect(toggleSort(onPageSeven, 'price').page).toBe(1);
    expect(toggleSort({ ...onPageSeven, sort: 'price' }, 'price').page).toBe(1);
  });

  it('página inválida na URL cai na primeira', () => {
    expect(parseTableState({ pagina: 'abc' }).page).toBe(1);
    expect(parseTableState({ pagina: '2.5' }).page).toBe(1);
    expect(parseTableState({ pagina: '-1' }).page).toBe(1);
    expect(parseTableState({ pagina: '3' }).page).toBe(3);
  });
});
