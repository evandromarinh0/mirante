import type { Candle, HistoryRange } from '@/lib/market/types';

/**
 * Geometria do gráfico, em funções puras.
 *
 * Fica separada do componente por dois motivos práticos: dá para testar escala
 * e caminho sem renderizar nada, e o SVG sai igual no servidor e no cliente —
 * o gráfico aparece no primeiro HTML, sem esperar JavaScript.
 *
 * Sem biblioteca de gráfico: para uma série de linha isto é escala mais `path`,
 * e o orçamento de bundle tem 31 KB de folga, menos do que qualquer biblioteca
 * do ramo custa sozinha.
 */

export interface ChartPoint {
  readonly x: number;
  readonly y: number;
  readonly candle: Candle;
  readonly index: number;
}

export interface AxisTick {
  readonly value: number;
  readonly position: number;
}

export interface ChartGeometry {
  readonly width: number;
  readonly height: number;
  readonly padding: ChartPadding;
  readonly points: readonly ChartPoint[];
  readonly linePath: string;
  readonly areaPath: string;
  readonly yTicks: readonly AxisTick[];
  readonly xTicks: readonly (AxisTick & { readonly label: string })[];
  readonly min: number;
  readonly max: number;
  /** Verdadeiro quando o eixo Y não parte de zero — a legenda precisa dizer. */
  readonly zeroExcluded: boolean;
}

export interface ChartPadding {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const DEFAULT_PADDING: ChartPadding = { top: 12, right: 8, bottom: 22, left: 48 };

/**
 * Teto de linhas de grade. Seis, não cinco: com cinco, o passo da família 1-2-5
 * salta de 2 para 5 e uma faixa de dez reais colapsa em duas linhas — perde-se
 * mais legibilidade do que se ganha em limpeza. A identidade visual foi emendada
 * com esta medição.
 */
const MAX_Y_TICKS = 6;

/**
 * Passos "redondos" na base 1-2-5. Régua em 37,4 não ajuda ninguém a ler um
 * preço; em 40 ajuda.
 */
export function niceStep(rawStep: number): number {
  if (rawStep <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  // Limiares de Heckbert (1.5 / 3 / 7), não 1 / 2 / 5: com os limiares duros,
  // um passo cru de 2,25 virava 5 e uma faixa de R$ 9 ficava com duas linhas
  // de grade. Aqui vira 2, e a mesma faixa ganha cinco — o teto da identidade.
  const step = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  return step * magnitude;
}

export function niceTicks(min: number, max: number, count = 4): readonly number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || count < 1) return [];
  if (min === max) return [min];

  const step = niceStep((max - min) / count);
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];

  for (let value = first; value <= max + step / 1000; value += step) {
    // Aritmética de ponto flutuante acumula: 0.1+0.2 nunca vai ser 0.3.
    ticks.push(Number(value.toFixed(10)));
  }

  return ticks;
}

/**
 * Série de preço **não** começa forçada em zero: espremeria a variação que a
 * pessoa quer ver. A folga de 6% impede que máxima e mínima toquem a borda.
 */
function priceDomain(candles: readonly Candle[]): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const candle of candles) {
    if (candle.close < min) min = candle.close;
    if (candle.close > max) max = candle.close;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: min * 0.99, max: max * 1.01 || 1 };

  const margin = (max - min) * 0.06;
  return { min: min - margin, max: max + margin };
}

function formatTickLabel(iso: string, range: HistoryRange): string {
  const date = new Date(iso);
  const intraday = range === '1d' || range === '5d';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    ...(intraday ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit' }),
  }).format(date);
}

/** Aumenta o passo até a grade caber no teto. */
function ticksWithinCap(min: number, max: number): readonly number[] {
  let count = 4;
  let ticks = niceTicks(min, max, count);
  while (ticks.length > MAX_Y_TICKS && count > 1) {
    count -= 1;
    ticks = niceTicks(min, max, count);
  }
  return ticks;
}

export function buildChartGeometry(
  candles: readonly Candle[],
  range: HistoryRange,
  width = 640,
  height = 220,
  padding: ChartPadding = DEFAULT_PADDING,
): ChartGeometry | null {
  if (candles.length === 0) return null;

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const { min, max } = priceDomain(candles);
  const span = max - min || 1;

  const toX = (index: number) =>
    candles.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (index / (candles.length - 1)) * plotWidth;

  const toY = (value: number) => padding.top + (1 - (value - min) / span) * plotHeight;

  const points: ChartPoint[] = candles.map((candle, index) => ({
    x: Number(toX(index).toFixed(2)),
    y: Number(toY(candle.close).toFixed(2)),
    candle,
    index,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
    .join(' ');

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const baseline = padding.top + plotHeight;
  const areaPath = `${linePath} L${last.x} ${baseline} L${first.x} ${baseline} Z`;

  const yTicks = ticksWithinCap(min, max).map((value) => ({
    value,
    position: Number(toY(value).toFixed(2)),
  }));

  // Três marcas no eixo X: começo, meio e fim. Mais que isso não cabe em 320px.
  const xIndexes =
    candles.length < 3 ? [0] : [0, Math.floor((candles.length - 1) / 2), candles.length - 1];

  const xTicks = xIndexes.map((index) => ({
    value: index,
    position: Number(toX(index).toFixed(2)),
    label: formatTickLabel(candles[index]!.date, range),
  }));

  return {
    width,
    height,
    padding,
    points,
    linePath,
    areaPath,
    yTicks,
    xTicks,
    min,
    max,
    zeroExcluded: min > 0,
  };
}
