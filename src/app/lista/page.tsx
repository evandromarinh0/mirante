import { Suspense } from 'react';
import { InstrumentTable } from '@/components/market/instrument-table';
import { DataStamp, FallbackNotice } from '@/components/state/data-stamp';
import { EmptyState } from '@/components/state/empty-state';
import { TableSkeleton } from '@/components/state/skeleton';
import { Container } from '@/components/ui/container';
import { ShareListButton } from '@/components/watchlist/share-list-button';
import { WatchlistSync } from '@/components/watchlist/watchlist-sync';
import { WATCHLIST_QUERY_KEY } from '@/lib/constants';
import { applyTableState, parseTableState, type RawSearchParams } from '@/lib/market/table-state';
import { getWatchlistRows } from '@/lib/services/market-service';

/**
 * Acompanhar — o destino do fluxo, e a razão de alguém voltar amanhã.
 *
 * Os preços saem da listagem grátis do universo, não de um lote de cotações: a
 * fonte aceita um ativo por requisição, então uma lista de vinte ativos
 * custaria vinte unidades de cota por revalidação. Uma lista de qualquer
 * tamanho custa zero.
 */

export const metadata = {
  title: 'Minha lista',
  description: 'Os ativos que você acompanha, com preço e variação do dia.',
};

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const raw = params[WATCHLIST_QUERY_KEY];
  const symbols = (Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '')).split(',').filter(Boolean);

  return (
    <Container className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl">Minha lista</h1>
        <p className="text-text-secondary max-w-[70ch] text-sm">
          Fica guardada neste navegador, sem cadastro. O link acima da tabela leva a mesma lista
          para outra pessoa ou outro dispositivo.
        </p>
      </header>

      {/* O componente de sincronização decide quem manda: URL ou armazenamento. */}
      <Suspense fallback={null}>
        <WatchlistSync />
      </Suspense>

      {symbols.length === 0 ? (
        <EmptyState
          title="Sua lista está vazia."
          description="Acompanhe um ativo pela estrela na tabela de mercado, ou pela página do próprio ativo. Ele aparece aqui na hora."
          action={{ href: '/', label: 'Ver o mercado' }}
        />
      ) : (
        <Suspense fallback={<TableSkeleton rows={symbols.length} />}>
          <WatchlistTable symbols={symbols} tableState={params} />
        </Suspense>
      )}
    </Container>
  );
}

async function WatchlistTable({
  symbols,
  tableState,
}: {
  readonly symbols: readonly string[];
  readonly tableState: RawSearchParams;
}) {
  const { rows, missing, origin, status } = await getWatchlistRows(symbols);
  const state = parseTableState(tableState);
  const ordered = applyTableState(rows, state);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DataStamp origin={origin} status={status} />
        <ShareListButton symbols={rows.map((row) => row.symbol)} />
      </div>

      <FallbackNotice origin={origin} />

      {ordered.length === 0 ? (
        <EmptyState
          title="Nenhum dos ativos da lista foi encontrado."
          description="Os códigos podem ter mudado, ou os ativos saíram de negociação."
          action={{ href: '/', label: 'Ver o mercado' }}
        />
      ) : (
        <InstrumentTable
          instruments={ordered}
          state={state}
          basePath="/lista"
          total={ordered.length}
          keepParams={{ [WATCHLIST_QUERY_KEY]: symbols.join(',') }}
        />
      )}

      {missing.length > 0 && (
        <p className="text-text-muted text-xs">
          Sem dado agora para {missing.join(', ')}. Continuam na lista — não removemos nada por
          conta própria.
        </p>
      )}
    </>
  );
}

export const revalidate = 60;
