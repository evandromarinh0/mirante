import { formatCurrency, formatDayMonth, formatDayMonthTime, formatVolume } from '@/lib/format';
import type { Series } from '@/lib/market/types';

/**
 * A série como tabela.
 *
 * Existe antes do gráfico de propósito: é a alternativa textual que o WCAG pede
 * para gráfico, e quase ninguém implementa. Quando o SVG entrar, isto continua
 * — atrás de um botão "ver como tabela" — em vez de ser escrito às pressas
 * depois.
 *
 * Ordem decrescente: quem abre a página quer o mais recente primeiro.
 */
export function SeriesTable({ series }: { readonly series: Series }) {
  const rows = [...series.candles].reverse();
  const intraday = series.range === '1d' || series.range === '5d';

  return (
    // Região rolável precisa receber foco: sem tabIndex, quem navega por
    // teclado não alcança o conteúdo abaixo do corte (WCAG 2.1.1).
    <div
      role="region"
      aria-label={`Série histórica de ${series.symbol}`}
      tabIndex={0}
      className="border-border relative max-h-96 overflow-y-auto rounded-md border"
    >
      <table className="w-full border-collapse text-sm">
        <caption className="text-text-muted border-border bg-bg-subtle sticky top-0 border-b px-[var(--cell-padding-x)] py-2 text-left text-xs">
          {rows.length} {intraday ? 'intervalos' : 'dias'} de negociação, do mais recente para o
          mais antigo
        </caption>
        <thead>
          <tr className="border-border bg-surface border-b">
            {['Data', 'Abertura', 'Máxima', 'Mínima', 'Fechamento', 'Volume'].map(
              (label, index) => (
                <th
                  key={label}
                  scope="col"
                  className={`text-text-secondary px-[var(--cell-padding-x)] py-2 font-medium ${
                    index === 0 ? 'text-left' : 'text-right'
                  } ${index > 3 || index === 0 ? '' : 'hidden sm:table-cell'}`}
                >
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((candle) => (
            <tr key={candle.date} className="rule-y last:border-b-0">
              <th
                scope="row"
                className="text-text-secondary px-[var(--cell-padding-x)] py-1.5 text-left font-normal"
              >
                <time dateTime={candle.date}>
                  {intraday ? formatDayMonthTime(candle.date) : formatDayMonth(candle.date)}
                </time>
              </th>
              <td className="tabular hidden px-[var(--cell-padding-x)] text-right sm:table-cell">
                {formatCurrency(candle.open)}
              </td>
              <td className="tabular hidden px-[var(--cell-padding-x)] text-right sm:table-cell">
                {formatCurrency(candle.high)}
              </td>
              <td className="tabular hidden px-[var(--cell-padding-x)] text-right sm:table-cell">
                {formatCurrency(candle.low)}
              </td>
              <td className="tabular px-[var(--cell-padding-x)] text-right">
                {formatCurrency(candle.close)}
              </td>
              <td className="tabular text-text-secondary px-[var(--cell-padding-x)] text-right">
                {formatVolume(candle.volume)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
