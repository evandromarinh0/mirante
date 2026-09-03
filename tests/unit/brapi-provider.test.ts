import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { brapiProvider } from '@/lib/market/providers/brapi/brapi-provider';

/**
 * O provider de produção é o único componente que fala com o mundo, e era o
 * único sem teste algum.
 *
 * O que estes testes protegem, além dos ramos de erro, são as **restrições
 * medidas na Etapa 0** — as que estão codificadas aqui e em nenhum outro lugar:
 *
 * - a listagem sem filtro trunca em 2.000 itens, então o universo é lido por
 *   tipo, com paginação;
 * - a cota grátis aceita um ativo por requisição;
 * - só a série histórica consome cota, e o piso de saldo dispara o fallback
 *   antes de estourar.
 *
 * Nenhuma linha de produção foi alterada para tornar isto testável: o cliente
 * usa o `fetch` global e lê o token do ambiente.
 */

interface FakeResponse {
  readonly status?: number;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
  readonly raw?: string;
}

/**
 * Duplo roteado por URL, não por fila.
 *
 * `listUniverse` busca ações e fundos em paralelo, então as chamadas intercalam.
 * Uma fila entregaria a resposta de ação para a chamada de fundo, e o teste
 * passaria a depender da ordem de escalonamento em vez do comportamento — foi
 * exatamente o que aconteceu na primeira versão deste arquivo.
 */
function stubFetch(route: (url: string) => FakeResponse) {
  const calls: string[] = [];

  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(String(url));
    const next = route(String(url));

    return {
      status: next.status ?? 200,
      headers: { get: (name: string) => next.headers?.[name.toLowerCase()] ?? null },
      text: async () => next.raw ?? JSON.stringify(next.body ?? {}),
      ok: (next.status ?? 200) < 400,
      init,
    };
  });

  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

/** Uma resposta para qualquer URL. */
const always = (response: FakeResponse) => () => response;

/** Resposta por tipo de listagem, que é como o provider realmente consulta. */
// Array mutável no tipo de propósito: Array.isArray não estreita somente-leitura.
function byType(map: {
  stock?: FakeResponse | FakeResponse[];
  fund?: FakeResponse | FakeResponse[];
}) {
  const page = { stock: 0, fund: 0 };

  return (url: string): FakeResponse => {
    const type = url.includes('type=fund') ? 'fund' : 'stock';
    const entry = map[type] ?? { body: { stocks: [] } };
    if (!Array.isArray(entry)) return entry;

    const index = page[type];
    page[type] += 1;
    return entry[index] ?? { body: { stocks: [] } };
  };
}

const listItem = (stock: string, over: Record<string, unknown> = {}) => ({
  stock,
  name: `${stock} S.A.`,
  close: 10,
  change: 1,
  volume: 100,
  type: 'stock',
  subType: 'stock',
  ...over,
});

const candle = (epoch: number, close: number) => ({
  date: epoch,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 50,
});

const okSeries: FakeResponse = {
  body: { results: [{ symbol: 'PETR4', historicalDataPrice: [candle(1_772_496_000, 40)] }] },
  headers: { 'x-ratelimit-remaining': '9000' },
};

beforeEach(() => {
  process.env.BRAPI_TOKEN = 'token-de-teste';
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.BRAPI_TOKEN;
});

describe('credencial', () => {
  it('vai no cabeçalho Authorization, nunca na URL', async () => {
    const { fetchMock } = stubFetch(always({ body: { stocks: [listItem('PETR4')] } }));
    await brapiProvider.listUniverse();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).not.toContain('token-de-teste');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer token-de-teste',
    });
  });

  it('sem token, lança — é bug de configuração, não estado do produto', async () => {
    delete process.env.BRAPI_TOKEN;
    stubFetch(always({ body: { stocks: [] } }));

    // O resolvedor de provider nunca escolhe brapi sem token; chegar aqui é bug.
    await expect(brapiProvider.listUniverse()).rejects.toThrow(/BRAPI_TOKEN/);
  });
});

describe('listUniverse — as restrições da Etapa 0', () => {
  it('lê por tipo, nunca a listagem sem filtro que trunca em 2.000 itens', async () => {
    const { calls } = stubFetch(
      byType({
        stock: { body: { stocks: [listItem('PETR4')] } },
        fund: { body: { stocks: [listItem('HGLG11', { type: 'fund', subType: 'fii' })] } },
      }),
    );

    await brapiProvider.listUniverse();

    expect(calls).toHaveLength(2);
    expect(calls.every((url) => url.includes('type='))).toBe(true);
    expect(calls.some((url) => url.includes('type=stock'))).toBe(true);
    expect(calls.some((url) => url.includes('type=fund'))).toBe(true);
  });

  it('segue para a página seguinte enquanto hasNextPage for verdadeiro', async () => {
    const { calls } = stubFetch(
      byType({
        stock: [
          { body: { stocks: [listItem('AAAA3')], hasNextPage: true } },
          { body: { stocks: [listItem('BBBB3')], hasNextPage: false } },
        ],
      }),
    );

    const result = await brapiProvider.listUniverse();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((instrument) => instrument.symbol)).toEqual(['AAAA3', 'BBBB3']);

    const stockCalls = calls.filter((url) => url.includes('type=stock'));
    expect(stockCalls).toHaveLength(2);
    expect(stockCalls[0]).toContain('page=1');
    expect(stockCalls[1]).toContain('page=2');
  });

  it('para de paginar quando hasNextPage não vem, sem pedir página vazia', async () => {
    const { calls } = stubFetch(
      byType({
        stock: { body: { stocks: [listItem('AAAA3')] } },
        fund: { body: { stocks: [listItem('BBBB11', { type: 'fund', subType: 'fii' })] } },
      }),
    );

    await brapiProvider.listUniverse();
    expect(calls).toHaveLength(2);
  });

  it('mescla ações e FIIs, e descarta o que não é nenhum dos dois', async () => {
    stubFetch(
      byType({
        stock: { body: { stocks: [listItem('PETR4')] } },
        fund: {
          body: {
            stocks: [
              listItem('HGLG11', { type: 'fund', subType: 'fii' }),
              listItem('BOVA11', { type: 'fund', subType: 'etf' }),
            ],
          },
        },
      }),
    );

    const result = await brapiProvider.listUniverse();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((instrument) => instrument.symbol)).toEqual(['PETR4', 'HGLG11']);
  });

  it('falha de um tipo reprova a listagem inteira, em vez de devolver metade', async () => {
    stubFetch(
      byType({
        stock: { body: { stocks: [listItem('PETR4')] } },
        fund: { status: 500, body: { error: true, message: 'boom' } },
      }),
    );

    const result = await brapiProvider.listUniverse();
    expect(result).toMatchObject({ ok: false, reason: 'unavailable' });
  });

  it('corpo em formato inesperado é indisponibilidade, não exceção', async () => {
    stubFetch(always({ body: { resultados: [] } }));

    const result = await brapiProvider.listUniverse();
    expect(result).toMatchObject({ ok: false, reason: 'unavailable' });
  });

  it('JSON inválido não derruba o provider', async () => {
    stubFetch(always({ raw: '<html>gateway timeout</html>' }));

    const result = await brapiProvider.listUniverse();
    expect(result.ok).toBe(false);
  });
});

describe('getHistory', () => {
  it('recusa ticker inválido antes de gastar requisição', async () => {
    const { calls } = stubFetch(always(okSeries));

    const result = await brapiProvider.getHistory('../etc/passwd', '3mo');

    expect(result).toMatchObject({ ok: false, reason: 'invalid-symbol' });
    // O ponto do teste: nenhuma chamada saiu. Validar depois de chamar não
    // protege nem a cota nem a chave de cache.
    expect(calls).toHaveLength(0);
  });

  it('traduz o período do domínio para os parâmetros da fonte', async () => {
    const { calls } = stubFetch(always(okSeries));
    await brapiProvider.getHistory('PETR4', '3mo');

    expect(calls[0]).toContain('/quote/PETR4');
    expect(calls[0]).toContain('range=3mo');
    expect(calls[0]).toContain('interval=1d');
  });

  it('pede um ativo por requisição, porque a cota grátis não aceita lote', async () => {
    const { calls } = stubFetch(always(okSeries));
    await brapiProvider.getHistory('PETR4', '1mo');

    expect(calls[0]).not.toContain(',');
  });

  it('devolve a série com o saldo de cota na procedência', async () => {
    stubFetch(always(okSeries));
    const result = await brapiProvider.getHistory('PETR4', '3mo');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.candles).toHaveLength(1);
    expect(result.data.candles[0]?.date).toBe('2026-03-03T00:00:00.000Z');
    expect(result.origin.quotaRemaining).toBe(9000);
    expect(result.origin.fallback).toBe(false);
  });

  it('cota abaixo do piso vira quota-exhausted antes de o dado ser usado', async () => {
    // O fallback é preventivo: 499 já dispara, mesmo com a resposta 200 em mãos.
    stubFetch(always({ ...okSeries, headers: { 'x-ratelimit-remaining': '499' } }));

    const result = await brapiProvider.getHistory('PETR4', '3mo');
    expect(result).toMatchObject({ ok: false, reason: 'quota-exhausted' });
  });

  it('cota exatamente no piso ainda serve o dado', async () => {
    stubFetch(always({ ...okSeries, headers: { 'x-ratelimit-remaining': '500' } }));

    const result = await brapiProvider.getHistory('PETR4', '3mo');
    expect(result.ok).toBe(true);
  });

  it.each([
    [429, 'RATE_LIMITED', 'rate-limited'],
    [404, 'NOT_FOUND', 'not-found'],
    [403, 'FEATURE_NOT_AVAILABLE', 'unavailable'],
    [400, 'INVALID_RANGE', 'unavailable'],
    [500, undefined, 'unavailable'],
  ] as const)('status %i (%s) vira %s', async (status, code, reason) => {
    stubFetch(always({ status, body: { error: true, code, message: 'x' } }));

    const result = await brapiProvider.getHistory('PETR4', '3mo');
    expect(result).toMatchObject({ ok: false, reason });
  });

  it('série vazia é not-found, não uma série de zero pontos', async () => {
    stubFetch(always({ body: { results: [{ symbol: 'PETR4', historicalDataPrice: [] }] } }));

    const result = await brapiProvider.getHistory('PETR4', '3mo');
    expect(result).toMatchObject({ ok: false, reason: 'not-found' });
  });

  it('candle incompleto é descartado, e o resto da série sobrevive', async () => {
    stubFetch(
      always({
        body: {
          results: [
            {
              symbol: 'PETR4',
              historicalDataPrice: [
                candle(1_772_496_000, 40),
                { date: 1_772_582_400, open: 41, high: 42, low: 40, close: null, volume: 10 },
                candle(1_772_668_800, 42),
              ],
            },
          ],
        },
      }),
    );

    const result = await brapiProvider.getHistory('PETR4', '3mo');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.candles).toHaveLength(2);
  });
});
