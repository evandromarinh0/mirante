import { InstrumentTable } from '@/components/market/instrument-table';
import { TableFilters } from '@/components/market/table-filters';
import { DataStamp, FallbackNotice } from '@/components/state/data-stamp';
import { EmptyState } from '@/components/state/empty-state';
import { Container } from '@/components/ui/container';
import { OVERVIEW_ROW_LIMIT } from '@/lib/constants';
import {
  applyTableState,
  emptyCause,
  parseTableState,
  type RawSearchParams,
} from '@/lib/market/table-state';
import { getMarketOverview } from '@/lib/services/market-service';

/**
 * Explorar — a tela principal.
 *
 * Renderizada no servidor a cada revalidação: a listagem do universo não
 * consome a cota mensal, então o custo de manter isto fresco é zero.
 */

const EMPTY_COPY = {
  query: 'Nenhum ativo corresponde à busca.',
  kind: 'Nenhum ativo nessa classe.',
  both: 'Nenhum ativo corresponde à busca dentro dessa classe.',
} as const;

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const state = parseTableState(params);
  const { instruments, origin, status } = await getMarketOverview();

  const matching = applyTableState(instruments, state);
  // A lista completa passa de mil ativos; a home mostra a primeira página dela.
  // Paginação e filtragem instantânea são a etapa seguinte, e a URL já é a
  // fonte de verdade para as duas.
  const visible = matching.slice(0, OVERVIEW_ROW_LIMIT);
  const cause = emptyCause(state);

  return (
    <Container className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl">Mercado</h1>
        <DataStamp origin={origin} status={status} />
      </header>

      <FallbackNotice origin={origin} />

      <TableFilters state={state} basePath="/" />

      {visible.length === 0 ? (
        <EmptyState
          title={cause ? EMPTY_COPY[cause] : 'Nenhum ativo disponível agora.'}
          description={
            cause === 'kind'
              ? 'Volte para todas as classes para ver o mercado inteiro.'
              : 'Confira o código digitado, ou limpe a busca para ver o mercado inteiro.'
          }
          action={{ href: '/', label: 'Limpar busca e filtro' }}
        />
      ) : (
        <>
          <InstrumentTable
            instruments={visible}
            state={state}
            basePath="/"
            total={matching.length}
          />
          {matching.length > visible.length && (
            <p className="text-text-muted text-xs">
              Mostrando os {visible.length} primeiros de {matching.length}. Use a busca ou o filtro
              de classe para chegar a um ativo específico.
            </p>
          )}
        </>
      )}
    </Container>
  );
}

// Teto de revalidação da página. A janela consciente do pregão fica no provider,
// que é quem sabe o custo de cada chamada; aqui o valor precisa ser estático.
export const revalidate = 60;

export const metadata = {
  title: 'Mercado',
  description:
    'Ações e fundos imobiliários da B3 com preço, variação do dia e volume. Sem cadastro.',
};
