import { fail, ok, type DataOrigin, type Result } from '../../result';
import { isValidSymbol, type MarketDataProvider } from '../../provider';
import type { HistoryRange, Instrument, Series } from '../../types';
import { brapiRequest, QUOTA_FLOOR, type BrapiResponse } from './client';
import { RANGE_PARAMS, toCandle, toFailureReason, toInstrument } from './mappers';
import { brapiListResponseSchema, brapiQuoteResponseSchema } from './schemas';

/**
 * Implementação de produção.
 *
 * As duas restrições medidas na Etapa 0 estão codificadas aqui e em nenhum
 * outro lugar: a listagem é paginada por tipo (a chamada sem filtro trunca em
 * 2.000 itens em silêncio) e a série histórica é a única operação que consome
 * cota.
 */

const PAGE_SIZE = 500;
const MAX_PAGES = 5;

function origin(response: BrapiResponse): DataOrigin {
  return {
    provider: 'brapi',
    fetchedAt: new Date().toISOString(),
    fallback: false,
    ...(response.quotaRemaining === undefined ? {} : { quotaRemaining: response.quotaRemaining }),
  };
}

/** Cota abaixo do piso é tratada como esgotada, para o fallback vir antes do erro. */
function quotaExhausted(response: BrapiResponse): boolean {
  return response.quotaRemaining !== undefined && response.quotaRemaining < QUOTA_FLOOR;
}

async function listByType(
  type: 'stock' | 'fund',
  revalidate: number,
): Promise<Result<readonly Instrument[]>> {
  const collected: Instrument[] = [];
  let last: BrapiResponse | null = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await brapiRequest(
      `/quote/list?type=${type}&limit=${PAGE_SIZE}&page=${page}`,
      { revalidate, tags: ['universe'] },
    );
    last = response;

    if (response.status !== 200) {
      return fail(toFailureReason(response.status, response.errorCode));
    }

    const parsed = brapiListResponseSchema.safeParse(response.body);
    if (!parsed.success) return fail('unavailable', 'Formato inesperado na listagem do universo.');

    for (const item of parsed.data.stocks) {
      const instrument = toInstrument(item);
      if (instrument) collected.push(instrument);
    }

    if (parsed.data.hasNextPage !== true) break;
  }

  if (!last) return fail('unavailable');
  return ok(collected, origin(last));
}

export const brapiProvider: MarketDataProvider = {
  id: 'brapi',

  async listUniverse(): Promise<Result<readonly Instrument[]>> {
    // A listagem não consome a cota mensal, então a revalidação aqui é decidida
    // por frescor do dado — quem define é o market-service.
    const revalidate = 60;

    const [stocks, funds] = await Promise.all([
      listByType('stock', revalidate),
      listByType('fund', revalidate),
    ]);

    if (!stocks.ok) return stocks;
    if (!funds.ok) return funds;

    return ok([...stocks.data, ...funds.data], stocks.origin);
  },

  async getHistory(symbol: string, range: HistoryRange): Promise<Result<Series>> {
    if (!isValidSymbol(symbol)) return fail('invalid-symbol');

    const params = RANGE_PARAMS[range];
    const response = await brapiRequest(
      `/quote/${symbol}?range=${params.range}&interval=${params.interval}`,
      { revalidate: 86_400, tags: ['history', `history:${symbol}`] },
    );

    if (quotaExhausted(response)) return fail('quota-exhausted');
    if (response.status !== 200) {
      return fail(toFailureReason(response.status, response.errorCode), response.errorCode);
    }

    const parsed = brapiQuoteResponseSchema.safeParse(response.body);
    if (!parsed.success) return fail('unavailable', 'Formato inesperado na série histórica.');

    const raw = parsed.data.results[0]?.historicalDataPrice ?? [];
    const candles = raw
      .map(toCandle)
      .filter((candle): candle is NonNullable<typeof candle> => candle !== null);

    if (candles.length === 0) return fail('not-found');

    return ok({ symbol, range, candles }, origin(response));
  },
};
