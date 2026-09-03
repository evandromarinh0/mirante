import type { FailureReason } from '../../result';
import type { Candle, HistoryRange, Instrument, InstrumentKind } from '../../types';
import type { BrapiCandle, BrapiListItem } from './schemas';

/**
 * Tradução da forma da Brapi para o domínio. É aqui que os nomes de terceiro
 * morrem: nada além deste arquivo conhece `market_cap` ou `subType`.
 */

/** `subType` é o único campo que separa FII de ETF, FI-Agro, FIP e FIDC. */
export function toInstrumentKind(item: BrapiListItem): InstrumentKind | null {
  if (item.type === 'stock') return 'stock';
  if (item.type === 'fund' && item.subType === 'fii') return 'reit';
  return null;
}

/**
 * A listagem devolve variação só em percentual. O valor absoluto é derivado do
 * preço de fechamento — aritmética sobre o que a fonte deu, não estimativa:
 * `close` já é o preço pós-variação, então o valor em reais é
 * `close × pct / (100 + pct)`.
 */
function absoluteChange(close: number, changePercent: number): number {
  const denominator = 100 + changePercent;
  if (denominator === 0) return 0;
  return (close * changePercent) / denominator;
}

export function toInstrument(item: BrapiListItem): Instrument | null {
  const kind = toInstrumentKind(item);
  if (kind === null) return null;
  // Ativo sem preço não é linha de tabela: seria uma célula vazia fingindo dado.
  if (item.close == null) return null;

  const changePercent = item.change ?? 0;

  return {
    symbol: item.stock,
    name: item.name?.trim() || item.stock,
    kind,
    price: item.close,
    change: absoluteChange(item.close, changePercent),
    changePercent,
    volume: item.volume ?? 0,
    sector: item.sector?.trim() || null,
  };
}

export function toCandle(raw: BrapiCandle): Candle | null {
  if (raw.close == null || raw.open == null || raw.high == null || raw.low == null) return null;
  return {
    date: new Date(raw.date * 1000).toISOString(),
    open: raw.open,
    high: raw.high,
    low: raw.low,
    close: raw.close,
    volume: raw.volume ?? 0,
  };
}

/**
 * Status HTTP e `code` da Brapi para motivo de domínio. `FEATURE_NOT_AVAILABLE`
 * e `INVALID_RANGE` significam recurso de plano pago: para o produto isso é
 * indisponibilidade, não erro do visitante.
 */
export function toFailureReason(status: number, code: string | undefined): FailureReason {
  if (status === 429 || code === 'RATE_LIMITED') return 'rate-limited';
  if (status === 404 || code === 'NOT_FOUND') return 'not-found';
  return 'unavailable';
}

/** Períodos do domínio para os parâmetros da Brapi. */
export const RANGE_PARAMS: Record<HistoryRange, { range: string; interval: string }> = {
  '1d': { range: '1d', interval: '30m' },
  '5d': { range: '5d', interval: '60m' },
  '1mo': { range: '1mo', interval: '1d' },
  '3mo': { range: '3mo', interval: '1d' },
};
