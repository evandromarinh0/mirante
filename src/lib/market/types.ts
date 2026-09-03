/**
 * Modelo de domínio do Mirante. Nenhum campo aqui carrega nome de terceiro:
 * é o que desacopla o produto da fonte, mais do que a interface do provider.
 */

export type InstrumentKind = 'stock' | 'reit';

/** Linha da tabela de mercado. Vem da listagem do universo, que é grátis. */
export interface Instrument {
  readonly symbol: string;
  readonly name: string;
  readonly kind: InstrumentKind;
  readonly price: number;
  /** Variação do dia em reais. Derivada de `changePercent` — ver o mapper. */
  readonly change: number;
  readonly changePercent: number;
  readonly volume: number;
  readonly sector: string | null;
}

/** Um ponto da série histórica. `date` é ISO 8601, sempre em UTC. */
export interface Candle {
  readonly date: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

export interface Series {
  readonly symbol: string;
  readonly range: HistoryRange;
  readonly candles: readonly Candle[];
}

/** Números do período, calculados a partir da série — não vêm da fonte. */
export interface SeriesStats {
  readonly open: number;
  readonly close: number;
  readonly high: number;
  readonly low: number;
  readonly change: number;
  readonly changePercent: number;
  readonly averageVolume: number;
}

/**
 * Períodos disponíveis. A lista é curta porque a cota grátis libera só estes
 * quatro; ver docs/decisions/0002 deste repositório.
 */
export const HISTORY_RANGES = ['1d', '5d', '1mo', '3mo'] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

export const DEFAULT_RANGE: HistoryRange = '3mo';

export function isHistoryRange(value: unknown): value is HistoryRange {
  return typeof value === 'string' && (HISTORY_RANGES as readonly string[]).includes(value);
}

export const RANGE_LABELS: Record<HistoryRange, string> = {
  '1d': '1 dia',
  '5d': '5 dias',
  '1mo': '1 mês',
  '3mo': '3 meses',
};

export const RANGE_SHORT_LABELS: Record<HistoryRange, string> = {
  '1d': '1D',
  '5d': '5D',
  '1mo': '1M',
  '3mo': '3M',
};

export const KIND_LABELS: Record<InstrumentKind, string> = {
  stock: 'Ação',
  reit: 'FII',
};
