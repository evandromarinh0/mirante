import { describe, expect, it } from 'vitest';
import { parseWatchlistParam, sameWatchlist, toWatchlistParam } from '@/lib/market/watchlist-url';

/**
 * O bug que estes testes travam: a comparação entre a lista da URL e a guardada
 * no navegador confrontava ordem de inserção com ordem alfabética, então duas
 * listas idênticas em ordem diferente eram declaradas diferentes — e a pessoa
 * era avisada de que a própria lista tinha vindo do link de outra pessoa.
 *
 * O caso que escapou da suíte anterior está no primeiro teste: **dois** ativos
 * em ordem não alfabética. Com um só, qualquer comparação passa, porque um
 * elemento sozinho sempre ordena para si mesmo.
 */

describe('sameWatchlist', () => {
  it('a ordem não conta — o caso que passou pela suíte anterior', () => {
    // Marcar HGLG11 e depois ADSH11 dá a mesma lista de quem marcou ao contrário.
    expect(sameWatchlist(['HGLG11', 'ADSH11'], ['ADSH11', 'HGLG11'])).toBe(true);
    expect(sameWatchlist(['HGLG11', 'ADSH11'], ['HGLG11', 'ADSH11'])).toBe(true);
  });

  it('continua distinguindo listas de verdade diferentes', () => {
    expect(sameWatchlist(['HGLG11', 'ADSH11'], ['HGLG11'])).toBe(false);
    expect(sameWatchlist(['HGLG11'], ['MXRF11'])).toBe(false);
    expect(sameWatchlist(['HGLG11', 'ADSH11'], ['HGLG11', 'MXRF11'])).toBe(false);
  });

  it('duas listas vazias são a mesma lista', () => {
    expect(sameWatchlist([], [])).toBe(true);
  });

  it('repetição não inventa diferença', () => {
    expect(sameWatchlist(['HGLG11', 'HGLG11'], ['HGLG11'])).toBe(true);
  });

  it('caixa não conta: a URL pode vir digitada à mão', () => {
    expect(sameWatchlist(['hglg11'], ['HGLG11'])).toBe(true);
  });

  it('lista longa em ordem embaralhada é a mesma lista', () => {
    const marked = ['VALE3', 'HGLG11', 'PETR4', 'MXRF11', 'ITUB4'];
    const shuffled = ['ITUB4', 'PETR4', 'VALE3', 'MXRF11', 'HGLG11'];
    expect(sameWatchlist(marked, shuffled)).toBe(true);
  });
});

describe('parseWatchlistParam', () => {
  it('lê a lista preservando a ordem em que veio', () => {
    expect(parseWatchlistParam('HGLG11,ADSH11')).toEqual(['HGLG11', 'ADSH11']);
  });

  it('descarta o que não é ticker da B3 — a URL é entrada de terceiro', () => {
    expect(parseWatchlistParam('HGLG11,,../etc/passwd,MXRF11;DROP,ABC')).toEqual(['HGLG11']);
  });

  it('normaliza caixa e espaço', () => {
    expect(parseWatchlistParam(' petr4 ,vale3')).toEqual(['PETR4', 'VALE3']);
  });

  it('deduplica sem alterar a primeira ocorrência', () => {
    expect(parseWatchlistParam('PETR4,VALE3,PETR4')).toEqual(['PETR4', 'VALE3']);
  });

  it('ausência e vazio devolvem lista vazia, não item vazio', () => {
    expect(parseWatchlistParam(undefined)).toEqual([]);
    expect(parseWatchlistParam('')).toEqual([]);
    expect(parseWatchlistParam(',,,')).toEqual([]);
  });

  it('parâmetro repetido usa o primeiro valor', () => {
    expect(parseWatchlistParam(['PETR4', 'VALE3'])).toEqual(['PETR4']);
  });
});

describe('toWatchlistParam', () => {
  it('sobrevive à ida e volta', () => {
    const symbols = ['HGLG11', 'ADSH11', 'PETR4'];
    expect(parseWatchlistParam(toWatchlistParam(symbols))).toEqual(symbols);
  });

  it('não escreve ticker inválido na URL', () => {
    expect(toWatchlistParam(['PETR4', 'lixo', ''])).toBe('PETR4');
  });
});
