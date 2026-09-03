import fixtureSeries from '@/fixtures/series.json';
import fixtureUniverse from '@/fixtures/universe.json';
import { isValidSymbol, type MarketDataProvider } from '../provider';
import { fail, ok, type Result } from '../result';
import type { HistoryRange, Instrument, Series } from '../types';

/**
 * Provider de testes, desenvolvimento e preview.
 *
 * Os dados são **reais**, capturados uma vez da fonte (`npm run snapshot`), e
 * não inventados: um universo de 24 ativos e séries de seis tickers. Assim
 * teste e preview não dependem de rede, não gastam cota e ainda assim exercitam
 * o formato verdadeiro — incluindo os casos chatos, como FII cujo nome vem
 * igual ao ticker.
 */

const universe = fixtureUniverse.instruments as readonly Instrument[];
const series = fixtureSeries.series as Record<string, Series | undefined>;

function fixtureOrigin() {
  // 'fallback' segue significando 'a fonte viva falhou'; quem marca este dado
  // como não-ao-vivo é o provider, e a UI lê isso por isLiveData.
  return {
    provider: 'fixture' as const,
    fetchedAt: fixtureUniverse.capturedAt,
    fallback: false,
  };
}

export const fixtureProvider: MarketDataProvider = {
  id: 'fixture',

  listUniverse(): Promise<Result<readonly Instrument[]>> {
    return Promise.resolve(ok(universe, fixtureOrigin()));
  },

  getHistory(symbol: string, range: HistoryRange): Promise<Result<Series>> {
    if (!isValidSymbol(symbol)) return Promise.resolve(fail('invalid-symbol'));

    const found = series[`${symbol}:${range}`];
    if (!found) return Promise.resolve(fail('not-found'));

    return Promise.resolve(ok(found, fixtureOrigin()));
  },
};
