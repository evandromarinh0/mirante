import snapshot from '@/data/universe-snapshot.json';
import { isValidSymbol, type MarketDataProvider } from '../provider';
import { fail, ok, type Result } from '../result';
import type { HistoryRange, Instrument, Series } from '../types';

/**
 * Fallback versionado: o universo inteiro como estava no dia da captura.
 *
 * Existe para que ninguém encontre tela de erro — e **sempre** se identifica
 * como fallback, porque mostrar dado velho como se fosse fresco é pior do que
 * mostrar erro. A UI usa `origin.fallback` para dizer isso.
 *
 * Não tem série histórica: guardar candles de 1.120 ativos no repositório para
 * cobrir uma indisponibilidade não se paga. O detalhe degrada a seção do
 * gráfico, não a página.
 */

const instruments = snapshot.instruments as readonly Instrument[];

export const snapshotProvider: MarketDataProvider = {
  id: 'snapshot',

  listUniverse(): Promise<Result<readonly Instrument[]>> {
    return Promise.resolve(
      ok(instruments, {
        provider: 'snapshot',
        fetchedAt: snapshot.capturedAt,
        fallback: true,
      }),
    );
  },

  getHistory(symbol: string, _range: HistoryRange): Promise<Result<Series>> {
    if (!isValidSymbol(symbol)) return Promise.resolve(fail('invalid-symbol'));
    return Promise.resolve(fail('unavailable', 'O snapshot de fallback não guarda séries.'));
  },
};
