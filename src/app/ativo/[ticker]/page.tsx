import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SectionError } from '@/components/state/error-state';
import { DataStamp, DataOriginNotice } from '@/components/state/data-stamp';
import { PriceChart } from '@/components/market/price-chart';
import { SeriesTable } from '@/components/market/series-table';
import { Container } from '@/components/ui/container';
import { ValueChange } from '@/components/ui/value-change';
import { WatchButton } from '@/components/watchlist/watch-button';
import { formatCurrency, formatVolume } from '@/lib/format';
import { normalizeSymbol } from '@/lib/market/provider';
import {
  DEFAULT_RANGE,
  isHistoryRange,
  KIND_LABELS,
  RANGE_LABELS,
  RANGE_SHORT_LABELS,
  HISTORY_RANGES,
  type HistoryRange,
} from '@/lib/market/types';
import { getInstrumentDetail } from '@/lib/services/market-service';
import { cn } from '@/lib/cn';

/**
 * Observar — o detalhe de um ativo.
 *
 * É a principal porta de entrada por busca, então renderiza no servidor e o
 * número aparece sem exigir interação.
 *
 * O seletor tem quatro períodos porque é o que a cota grátis libera. O gráfico
 * em SVG entra na etapa seguinte; a tabela da série existe primeiro porque ela
 * é a alternativa textual que o gráfico vai precisar de qualquer forma — nesta
 * ordem, a acessibilidade não é retrofit.
 */

interface PageProps {
  readonly params: Promise<{ readonly ticker: string }>;
  readonly searchParams: Promise<{ readonly periodo?: string }>;
}

export default async function InstrumentPage({ params, searchParams }: PageProps) {
  const { ticker } = await params;
  const { periodo } = await searchParams;

  const symbol = normalizeSymbol(ticker);
  const range: HistoryRange = isHistoryRange(periodo) ? periodo : DEFAULT_RANGE;

  const detail = await getInstrumentDetail(symbol, range);

  if (!detail.ok) {
    // Ticker inválido ou inexistente é 404 de verdade. Fonte indisponível não
    // é erro de quem visita: a página aparece, dizendo o que faltou.
    if (detail.reason === 'not-found' || detail.reason === 'invalid-symbol') notFound();

    return (
      <Container className="flex flex-col gap-5">
        <nav aria-label="Trilha" className="text-text-muted text-xs">
          <Link href="/" className="hover:text-text underline decoration-1 underline-offset-2">
            Mercado
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="font-mono">{symbol}</span>
        </nav>
        <DataStamp origin={null} status={detail.status} />
        <SectionError reason={detail.reason} subject={`Os dados de ${symbol}`} />
      </Container>
    );
  }

  const { instrument, origin, status, series, stats } = detail;

  return (
    <Container className="flex flex-col gap-6">
      <nav aria-label="Trilha" className="text-text-muted text-xs">
        <Link href="/" className="hover:text-text underline decoration-1 underline-offset-2">
          Mercado
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{instrument.symbol}</span>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-text-muted font-mono text-xs tracking-wide">
              {instrument.symbol} · {KIND_LABELS[instrument.kind]}
              {instrument.sector && ` · ${instrument.sector}`}
            </p>
            <h1 className="mt-1 text-2xl">
              {instrument.name === instrument.symbol ? instrument.symbol : instrument.name}
            </h1>
          </div>
          <WatchButton symbol={instrument.symbol} className="hit-area" />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="tabular text-3xl">{formatCurrency(instrument.price)}</p>
          <ValueChange
            value={instrument.change}
            percent={instrument.changePercent}
            display="both"
            className="text-base"
          />
        </div>

        <DataStamp origin={origin} status={status} />
      </header>

      <DataOriginNotice origin={origin} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">Histórico</h2>
          <div role="group" aria-label="Período do histórico" className="flex gap-1">
            {HISTORY_RANGES.map((option) => {
              const active = option === range;
              return (
                <Link
                  key={option}
                  href={
                    option === DEFAULT_RANGE
                      ? `/ativo/${instrument.symbol}`
                      : `/ativo/${instrument.symbol}?periodo=${option}`
                  }
                  scroll={false}
                  aria-current={active ? 'true' : undefined}
                  aria-label={RANGE_LABELS[option]}
                  className={cn(
                    'border-border inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-medium',
                    active
                      ? 'bg-accent-subtle text-text border-transparent'
                      : 'text-text-secondary hover:text-text',
                  )}
                >
                  {RANGE_SHORT_LABELS[option]}
                </Link>
              );
            })}
          </div>
        </div>

        {series.ok ? (
          <>
            {stats && <PriceChart series={series.data} stats={stats} symbol={instrument.symbol} />}

            {stats && (
              <dl className="border-border grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border p-4 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Abertura" value={formatCurrency(stats.open)} />
                <Stat label="Fechamento" value={formatCurrency(stats.close)} />
                <Stat label="Máxima" value={formatCurrency(stats.high)} />
                <Stat label="Mínima" value={formatCurrency(stats.low)} />
                <Stat
                  label="Variação"
                  value={
                    <ValueChange
                      value={stats.change}
                      percent={stats.changePercent}
                      display="both"
                      className="text-sm"
                    />
                  }
                />
                <Stat label="Volume médio" value={formatVolume(stats.averageVolume)} />
              </dl>
            )}
            <details className="border-border rounded-md border">
              <summary className="text-text-secondary hover:text-text hit-area flex cursor-pointer items-center px-3 text-sm font-medium">
                Ver como tabela
              </summary>
              <div className="border-border border-t p-3">
                <SeriesTable series={series.data} />
              </div>
            </details>
          </>
        ) : (
          <SectionError reason={series.reason} subject="O histórico deste ativo" />
        )}
      </section>

      <p className="text-text-muted max-w-[70ch] text-xs">
        A variação do período usa o preço de fechamento. Proventos e dividendos não entram no
        cálculo: a fonte gratuita não os disponibiliza, e estimá-los seria inventar número.
      </p>
    </Container>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-text-muted text-2xs tracking-wide uppercase">{label}</dt>
      <dd className="tabular text-text mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export const revalidate = 300;
