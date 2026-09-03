import { getFallbackProvider, getProvider } from '@/lib/market/providers';
import { getMarketStatus, type MarketStatus } from '@/lib/market/market-status';
import { normalizeSymbol, isValidSymbol } from '@/lib/market/provider';
import { fail, type DataOrigin, type FailureReason, type Result } from '@/lib/market/result';
import {
  DEFAULT_RANGE,
  type HistoryRange,
  type Instrument,
  type Series,
  type SeriesStats,
} from '@/lib/market/types';

/**
 * A camada que a UI usa. Nenhuma página, nenhum componente e nenhum hook
 * conhece provider, e muito menos a Brapi: o caminho é
 * `UI → serviço → provider → fonte`, e ele só vai numa direção.
 *
 * Aqui moram três responsabilidades que não são do provider: compor o estado do
 * mercado com o dado, cair para o fallback quando a fonte falha, e calcular o
 * que é derivado (estatísticas do período).
 */

export interface MarketOverview {
  readonly instruments: readonly Instrument[];
  readonly origin: DataOrigin;
  readonly status: MarketStatus;
}

export interface InstrumentDetail {
  readonly instrument: Instrument;
  readonly origin: DataOrigin;
  readonly status: MarketStatus;
  /** Falha da série degrada só a seção do gráfico, não a página. */
  readonly series: Result<Series>;
  readonly stats: SeriesStats | null;
}

/** Uma tentativa no provider configurado, e o snapshot se ela falhar. */
async function withFallback<T>(
  attempt: () => Promise<Result<T>>,
  fallback: () => Promise<Result<T>>,
): Promise<Result<T>> {
  const result = await attempt();
  if (result.ok) return result;
  // 'not-found' e 'invalid-symbol' são respostas corretas: o fallback não
  // conserta ticker que não existe, só disfarçaria o estado certo.
  if (result.reason === 'not-found' || result.reason === 'invalid-symbol') return result;
  return fallback();
}

export async function getMarketOverview(now: Date = new Date()): Promise<MarketOverview> {
  const provider = getProvider();
  const result = await withFallback(
    () => provider.listUniverse(),
    () => getFallbackProvider().listUniverse(),
  );

  const status = getMarketStatus(now);

  // O snapshot versionado sempre responde, então a tabela nunca fica sem dado.
  if (!result.ok) {
    const last = await getFallbackProvider().listUniverse();
    if (!last.ok) throw new Error('Snapshot de fallback indisponível: isso é bug, não estado.');
    return { instruments: last.data, origin: last.origin, status };
  }

  return { instruments: result.data, origin: result.origin, status };
}

export function computeStats(series: Series): SeriesStats | null {
  const candles = series.candles;
  const first = candles[0];
  const last = candles[candles.length - 1];
  if (!first || !last) return null;

  let high = first.high;
  let low = first.low;
  let volumeSum = 0;

  for (const candle of candles) {
    if (candle.high > high) high = candle.high;
    if (candle.low < low) low = candle.low;
    volumeSum += candle.volume;
  }

  const change = last.close - first.open;

  return {
    open: first.open,
    close: last.close,
    high,
    low,
    change,
    changePercent: first.open === 0 ? 0 : (change / first.open) * 100,
    averageVolume: Math.round(volumeSum / candles.length),
  };
}

export async function getInstrumentDetail(
  rawSymbol: string,
  range: HistoryRange = DEFAULT_RANGE,
  now: Date = new Date(),
): Promise<InstrumentDetail | { readonly notFound: true; readonly reason: FailureReason }> {
  const symbol = normalizeSymbol(rawSymbol);
  if (!isValidSymbol(symbol)) return { notFound: true, reason: 'invalid-symbol' };

  const overview = await getMarketOverview(now);
  const instrument = overview.instruments.find((candidate) => candidate.symbol === symbol);
  if (!instrument) return { notFound: true, reason: 'not-found' };

  const provider = getProvider();
  const series = await withFallback(
    () => provider.getHistory(symbol, range),
    () => getFallbackProvider().getHistory(symbol, range),
  );

  return {
    instrument,
    origin: overview.origin,
    status: overview.status,
    series,
    stats: series.ok ? computeStats(series.data) : null,
  };
}

/**
 * Linhas da lista de acompanhamento.
 *
 * Sai da listagem grátis em vez de um lote de cotações — a fonte aceita um
 * ativo por requisição, então uma lista de 20 ativos custaria 20 unidades de
 * cota por revalidação. Ver docs/decisions/0002.
 */
export async function getWatchlistRows(
  symbols: readonly string[],
  now: Date = new Date(),
): Promise<{
  readonly rows: readonly Instrument[];
  readonly missing: readonly string[];
  readonly origin: DataOrigin;
  readonly status: MarketStatus;
}> {
  const overview = await getMarketOverview(now);
  const wanted = new Set(symbols.map(normalizeSymbol));

  const rows = overview.instruments.filter((instrument) => wanted.has(instrument.symbol));
  const found = new Set(rows.map((row) => row.symbol));
  const missing = [...wanted].filter((symbol) => !found.has(symbol));

  return { rows, missing, origin: overview.origin, status: overview.status };
}

export function unavailable(reason: FailureReason): Result<never> {
  return fail(reason);
}
