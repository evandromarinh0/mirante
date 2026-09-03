import Link from 'next/link';
import { WatchButton } from '@/components/watchlist/watch-button';
import { formatCurrency, formatVolume } from '@/lib/format';
import {
  defaultDirection,
  tableHref,
  toggleSort,
  type SortColumn,
  type TableState,
} from '@/lib/market/table-state';
import { KIND_LABELS, type Instrument } from '@/lib/market/types';
import { ValueChange } from '@/components/ui/value-change';

/**
 * A tabela de mercado.
 *
 * É `<table>` de verdade, com `<caption>`, `scope` nos cabeçalhos e `aria-sort`
 * na coluna ordenada. Ordenar é **link**, não botão: o estado vive na URL, então
 * a ordenação funciona sem JavaScript, sobrevive ao recarregar e é
 * compartilhável — que é o motivo de a URL ser a fonte de verdade.
 *
 * A contagem e o critério de ordenação ficam no `<caption>`, que o leitor de
 * tela anuncia ao entrar na tabela. Região `aria-live` entra na etapa em que a
 * filtragem passa a ser instantânea no cliente; hoje cada mudança é navegação,
 * e anunciar duas vezes seria pior.
 */

const COLUMNS: ReadonlyArray<{
  readonly key: SortColumn;
  readonly label: string;
  readonly align: 'left' | 'right';
  /** Colunas que não cabem em 320px. */
  readonly hideBelow?: 'sm' | 'md';
}> = [
  { key: 'symbol', label: 'Ativo', align: 'left' },
  { key: 'name', label: 'Nome', align: 'left', hideBelow: 'md' },
  { key: 'price', label: 'Preço', align: 'right' },
  { key: 'changePercent', label: 'Variação', align: 'right' },
  { key: 'volume', label: 'Volume', align: 'right', hideBelow: 'sm' },
];

const HIDE_CLASS = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
} as const;

const SORT_LABEL: Record<SortColumn, string> = {
  symbol: 'código',
  name: 'nome',
  price: 'preço',
  changePercent: 'variação',
  volume: 'volume',
};

interface InstrumentTableProps {
  readonly instruments: readonly Instrument[];
  readonly state: TableState;
  /** Rota base dos links de ordenação: a tabela serve `/` e `/lista`. */
  readonly basePath: string;
  readonly total: number;
  /** Ação de linha da lista de acompanhamento. */
  readonly showWatchButton?: boolean;
  /** Parâmetros de URL a preservar nos links de ordenação. */
  readonly keepParams?: Readonly<Record<string, string>>;
}

export function InstrumentTable({
  instruments,
  state,
  basePath,
  total,
  showWatchButton = true,
  keepParams = {},
}: InstrumentTableProps) {
  const orderLabel = `${SORT_LABEL[state.sort]}, ${
    state.direction === 'desc' ? 'do maior para o menor' : 'do menor para o maior'
  }`;

  return (
    <div
      role="region"
      aria-label="Tabela de ativos"
      tabIndex={0}
      className="border-border relative overflow-x-auto rounded-md border"
    >
      <table className="w-full border-collapse text-sm">
        <caption className="text-text-muted border-border bg-bg-subtle border-b px-[var(--cell-padding-x)] py-2 text-left text-xs">
          {instruments.length === total
            ? `${total} ativos`
            : `${instruments.length} de ${total} ativos`}{' '}
          · ordenado por {orderLabel}
        </caption>

        <thead>
          <tr className="border-border border-b">
            {COLUMNS.map((column) => {
              const isSorted = state.sort === column.key;
              const next = toggleSort(state, column.key);
              const nextDirection = isSorted
                ? state.direction === 'asc'
                  ? 'crescente'
                  : 'decrescente'
                : defaultDirection(column.key) === 'asc'
                  ? 'crescente'
                  : 'decrescente';

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    isSorted ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className={[
                    'text-text-secondary px-[var(--cell-padding-x)] py-2 font-medium',
                    column.align === 'right' ? 'text-right' : 'text-left',
                    column.hideBelow ? HIDE_CLASS[column.hideBelow] : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <Link
                    href={tableHref(next, basePath, keepParams)}
                    scroll={false}
                    className="hover:text-text inline-flex items-center gap-1 rounded-sm"
                  >
                    {column.label}
                    <span aria-hidden="true" className="text-[0.65rem]">
                      {isSorted ? (state.direction === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                    <span className="sr-only">
                      — ordenar por {SORT_LABEL[column.key]}, {nextDirection}
                    </span>
                  </Link>
                </th>
              );
            })}
            {showWatchButton && (
              <th scope="col" className="w-10 px-1 py-2">
                <span className="sr-only">Acompanhar</span>
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {instruments.map((instrument) => (
            <tr key={instrument.symbol} className="rule-y last:border-b-0">
              <th
                scope="row"
                className="h-[var(--row-height)] px-[var(--cell-padding-x)] text-left font-normal"
              >
                <Link
                  href={`/ativo/${instrument.symbol}`}
                  className="text-text hover:text-accent font-mono text-xs font-medium tracking-wide"
                >
                  {instrument.symbol}
                </Link>
                <span className="text-text-muted text-2xs ml-2">
                  {KIND_LABELS[instrument.kind]}
                </span>
                {/* Em telas estreitas o nome não tem coluna própria; entra aqui
                    quando a fonte tem nome de verdade e não repete o ticker. */}
                {instrument.name !== instrument.symbol && (
                  <span className="text-text-muted line-clamp-1 block text-xs md:hidden">
                    {instrument.name}
                  </span>
                )}
              </th>

              <td
                className={`${HIDE_CLASS.md} text-text-secondary max-w-[28ch] truncate px-[var(--cell-padding-x)]`}
              >
                {instrument.name === instrument.symbol ? '—' : instrument.name}
              </td>

              <td className="tabular px-[var(--cell-padding-x)] text-right">
                {formatCurrency(instrument.price)}
              </td>

              <td className="px-[var(--cell-padding-x)] text-right">
                <ValueChange value={instrument.change} percent={instrument.changePercent} />
              </td>

              <td
                className={`${HIDE_CLASS.sm} tabular text-text-secondary px-[var(--cell-padding-x)] text-right`}
              >
                {formatVolume(instrument.volume)}
              </td>

              {showWatchButton && (
                <td className="px-1 text-right">
                  <WatchButton symbol={instrument.symbol} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
