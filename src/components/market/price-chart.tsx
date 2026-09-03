'use client';

import { useId, useMemo, useState } from 'react';
import { buildChartGeometry, type ChartPoint } from '@/lib/chart/geometry';
import { formatCurrency, formatDayMonth, formatDayMonthTime, formatPercent } from '@/lib/format';
import { RANGE_LABELS, type Series, type SeriesStats } from '@/lib/market/types';

/**
 * Gráfico da série, em SVG escrito à mão.
 *
 * Três decisões que valem mais que o desenho:
 *
 * 1. **Aparece sem JavaScript.** A geometria é pura e o SVG sai do render do
 *    servidor; o cliente só acrescenta o cursor. Um gráfico que só existe depois
 *    da hidratação é um retângulo vazio no primeiro paint.
 * 2. **Teclado é caminho de primeira classe**, não retrofit: o gráfico recebe
 *    foco e as setas andam ponto a ponto, com o valor anunciado por região viva.
 *    É o que quase nenhum dashboard faz.
 * 3. **A linha não é verde nem vermelha.** Direção se lê no rótulo e no sinal;
 *    a tinta é neutra. Colorir a linha por direção é informação por cor
 *    sozinha, e some em escala de cinza.
 *
 * Sem candlestick, sem zoom, sem anotação — escopo travado.
 */

const WIDTH = 640;
const HEIGHT = 220;

interface PriceChartProps {
  readonly series: Series;
  readonly stats: SeriesStats;
  readonly symbol: string;
}

export function PriceChart({ series, stats, symbol }: PriceChartProps) {
  const geometry = useMemo(
    () => buildChartGeometry(series.candles, series.range, WIDTH, HEIGHT),
    [series.candles, series.range],
  );

  const [cursor, setCursor] = useState<number | null>(null);
  const gradientId = useId();

  if (!geometry) return null;

  const { points, linePath, areaPath, yTicks, xTicks, padding } = geometry;
  const active: ChartPoint | null = cursor === null ? null : (points[cursor] ?? null);
  const intraday = series.range === '1d' || series.range === '5d';

  /** Resumo textual: é a alternativa que o WCAG pede para gráfico. */
  const summary =
    `Preço de ${symbol}, ${RANGE_LABELS[series.range]}, ` +
    `de ${formatCurrency(stats.open)} a ${formatCurrency(stats.close)}, ` +
    `${stats.change >= 0 ? 'alta' : 'baixa'} de ${formatPercent(stats.changePercent)}. ` +
    `Mínima ${formatCurrency(stats.low)}, máxima ${formatCurrency(stats.high)}.`;

  function moveCursor(delta: number) {
    setCursor((current) => {
      const next = (current ?? points.length - 1) + delta;
      return Math.min(Math.max(next, 0), points.length - 1);
    });
  }

  function pointFromPointer(event: React.PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    // O SVG é fluido: converte a posição real para o sistema do viewBox.
    const svgX = ((event.clientX - box.left) / box.width) * WIDTH;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    for (const point of points) {
      const candidate = Math.abs(point.x - svgX);
      if (candidate < distance) {
        distance = candidate;
        nearest = point.index;
      }
    }
    setCursor(nearest);
  }

  return (
    <figure className="m-0 flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="ring-offset-bg h-auto w-full touch-pan-y"
        role="img"
        aria-label={summary}
        tabIndex={0}
        onPointerMove={pointFromPointer}
        onPointerLeave={() => setCursor(null)}
        onFocus={() => setCursor((current) => current ?? points.length - 1)}
        onBlur={() => setCursor(null)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') moveCursor(1);
          else if (event.key === 'ArrowLeft') moveCursor(-1);
          else if (event.key === 'Home') setCursor(0);
          else if (event.key === 'End') setCursor(points.length - 1);
          else if (event.key === 'Escape') setCursor(null);
          else return;
          event.preventDefault();
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-ink)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--color-chart-ink)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grade horizontal apenas, no máximo cinco linhas. Sem grade vertical. */}
        {yTicks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={padding.left}
              x2={WIDTH - padding.right}
              y1={tick.position}
              y2={tick.position}
              stroke="var(--color-chart-grid)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 6}
              y={tick.position + 3}
              textAnchor="end"
              className="fill-[var(--color-text-muted)] font-mono text-[9px]"
            >
              {tick.value.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </text>
          </g>
        ))}

        {xTicks.map((tick) => (
          <text
            key={tick.value}
            x={tick.position}
            y={HEIGHT - 6}
            textAnchor={
              tick.value === 0 ? 'start' : tick.value === points.length - 1 ? 'end' : 'middle'
            }
            className="fill-[var(--color-text-muted)] font-mono text-[9px]"
          >
            {tick.label}
          </text>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-chart-ink)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {active && (
          <g>
            <line
              x1={active.x}
              x2={active.x}
              y1={padding.top}
              y2={HEIGHT - padding.bottom}
              stroke="var(--color-border-strong)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* Ponto marcado só no cursor: um marcador por observação viraria ruído. */}
            <circle
              cx={active.x}
              cy={active.y}
              r="3.5"
              fill="var(--color-bg)"
              stroke="var(--color-chart-ink)"
              strokeWidth="1.5"
            />
          </g>
        )}
      </svg>

      <figcaption className="text-text-muted flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
        {/* Região viva: é assim que a navegação por teclado fica audível. */}
        <span aria-live="polite" className="text-text-secondary tabular">
          {active ? (
            <>
              <time dateTime={active.candle.date}>
                {intraday
                  ? formatDayMonthTime(active.candle.date)
                  : formatDayMonth(active.candle.date)}
              </time>
              {' · '}
              {formatCurrency(active.candle.close)}
            </>
          ) : (
            'Passe o cursor ou use as setas do teclado para ler cada ponto.'
          )}
        </span>
        {geometry.zeroExcluded && <span>Escala não começa em zero.</span>}
      </figcaption>
    </figure>
  );
}
