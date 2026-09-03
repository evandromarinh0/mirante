import Link from 'next/link';
import { tableHref, type Page, type TableState } from '@/lib/market/table-state';
import type { Instrument } from '@/lib/market/types';

/**
 * Paginação por link, com o número da página na URL.
 *
 * `rel="prev"` e `rel="next"` não são decoração: dizem ao navegador e ao
 * indexador que as páginas formam uma sequência. E como é link, funciona sem
 * JavaScript e pode ser aberto em outra aba — coisa que botão com `onClick`
 * proíbe sem motivo.
 */
export function Pagination({
  page,
  state,
  basePath,
  keepParams = {},
}: {
  readonly page: Page<Instrument>;
  readonly state: TableState;
  readonly basePath: string;
  readonly keepParams?: Readonly<Record<string, string>>;
}) {
  if (page.totalPages <= 1) return null;

  const previousHref = tableHref({ ...state, page: page.page - 1 }, basePath, keepParams);
  const nextHref = tableHref({ ...state, page: page.page + 1 }, basePath, keepParams);
  const hasPrevious = page.page > 1;
  const hasNext = page.page < page.totalPages;

  const buttonClass =
    'border-border-strong text-text hover:bg-bg-subtle hit-area inline-flex items-center rounded-md border px-3 text-sm font-medium';

  return (
    <nav
      aria-label="Paginação da tabela"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-text-muted tabular text-xs">
        {page.firstIndex}–{page.lastIndex} de {page.total.toLocaleString('pt-BR')} ativos · página{' '}
        {page.page} de {page.totalPages}
      </p>

      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Link href={previousHref} rel="prev" scroll={true} className={buttonClass}>
            Anterior
          </Link>
        ) : (
          // Desabilitado é `span`, não link morto: link que não navega é ruído
          // na tabulação e mentira para leitor de tela.
          <span className="border-border text-text-muted hit-area inline-flex items-center rounded-md border px-3 text-sm">
            Anterior
          </span>
        )}

        {hasNext ? (
          <Link href={nextHref} rel="next" scroll={true} className={buttonClass}>
            Próxima
          </Link>
        ) : (
          <span className="border-border text-text-muted hit-area inline-flex items-center rounded-md border px-3 text-sm">
            Próxima
          </span>
        )}
      </div>
    </nav>
  );
}
