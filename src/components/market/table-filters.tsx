import Link from 'next/link';
import { cn } from '@/lib/cn';
import { tableHref, type KindFilter, type TableState } from '@/lib/market/table-state';
import { SearchField } from './search-field';

/**
 * Busca e filtro por classe.
 *
 * Um formulário `GET` e três links: funciona sem JavaScript, e o resultado é
 * sempre uma URL que dá para mandar para alguém. A filtragem enquanto se digita
 * é melhoria progressiva sobre isto, dentro de `SearchField` — não no lugar
 * disto.
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
      <SearchField state={state} basePath={basePath} keepParams={keepParams} />

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
              href={tableHref({ ...state, kind: kind.value, page: 1 }, basePath, keepParams)}
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
