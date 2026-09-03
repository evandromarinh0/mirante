import Link from 'next/link';
import { cn } from '@/lib/cn';
import { PARAM, tableHref, type KindFilter, type TableState } from '@/lib/market/table-state';

/**
 * Busca e filtro por classe.
 *
 * É um `<form method="get">` e três links: funciona sem JavaScript, e o
 * resultado é uma URL que dá para mandar para alguém. A filtragem instantânea
 * enquanto se digita entra depois, como melhoria progressiva sobre isto — e não
 * no lugar disto.
 */

const KINDS: ReadonlyArray<{ readonly value: KindFilter; readonly label: string }> = [
  { value: 'all', label: 'Tudo' },
  { value: 'stock', label: 'Ações' },
  { value: 'reit', label: 'FIIs' },
];

export function TableFilters({
  state,
  basePath,
  keepParams = {},
}: {
  readonly state: TableState;
  readonly basePath: string;
  readonly keepParams?: Readonly<Record<string, string>>;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form action={basePath} className="flex items-center gap-2">
        <label htmlFor="market-search" className="sr-only">
          Buscar por código ou nome
        </label>
        <input
          id="market-search"
          type="search"
          name={PARAM.query}
          defaultValue={state.query}
          placeholder="PETR4, banco, logística…"
          maxLength={32}
          autoComplete="off"
          className="border-border-strong bg-surface text-text placeholder:text-text-muted h-9 w-full rounded-md border px-3 text-sm sm:w-64"
        />
        {/* O filtro de classe viaja junto, senão buscar zeraria o filtro. */}
        {state.kind !== 'all' && (
          <input
            type="hidden"
            name={PARAM.kind}
            value={state.kind === 'stock' ? 'acoes' : 'fiis'}
          />
        )}
        <button
          type="submit"
          className="border-border-strong text-text hover:bg-bg-subtle h-9 rounded-md border px-3 text-sm font-medium"
        >
          Buscar
        </button>
      </form>

      <div
        role="group"
        aria-label="Filtrar por classe de ativo"
        className="border-border bg-bg-subtle inline-flex rounded-md border p-0.5"
      >
        {KINDS.map((kind) => {
          const active = state.kind === kind.value;
          return (
            <Link
              key={kind.value}
              href={tableHref({ ...state, kind: kind.value }, basePath, keepParams)}
              scroll={false}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'inline-flex h-8 items-center rounded-sm px-3 text-sm',
                active
                  ? 'bg-surface text-text font-medium shadow-[var(--shadow-sm)]'
                  : 'text-text-secondary hover:text-text',
              )}
            >
              {kind.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
