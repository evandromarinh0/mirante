import { cn } from '@/lib/cn';

/**
 * Esqueleto com a forma real do conteúdo, nunca spinner.
 *
 * A regra que vale mais que os componentes: **revalidação não volta ao
 * esqueleto.** Isto aparece só quando não há nada em cache; com dado em cache,
 * o conteúdo permanece e a atualização é discreta. Conteúdo que pisca para
 * vazio e volta é o erro mais comum em dashboard.
 */

function Bar({ className }: { readonly className?: string }) {
  return <span className={cn('bg-border block h-3 rounded-sm', className)} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 12 }: { readonly rows?: number }) {
  return (
    <div
      // Uma região viva só: doze linhas anunciadas seriam ruído em leitor de tela.
      role="status"
      aria-label="Carregando a tabela de mercado"
      className="border-border overflow-hidden rounded-md border"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="rule-y flex h-[var(--row-height)] items-center gap-4 px-[var(--cell-padding-x)] last:border-b-0"
        >
          <Bar className="w-16" />
          <Bar className="hidden w-48 sm:block" />
          <span className="flex-1" />
          <Bar className="w-16" />
          <Bar className="w-14" />
        </div>
      ))}
    </div>
  );
}

export function SeriesSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando a série histórica"
      className="border-border h-64 rounded-md border p-4"
    >
      <Bar className="w-24" />
      <div className="mt-6 flex h-40 items-end gap-1">
        {Array.from({ length: 32 }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="bg-border w-full rounded-t-sm"
            // Alturas fixas e variadas: um esqueleto plano não comunica a forma
            // do conteúdo, e altura aleatória mudaria a cada render.
            style={{ height: `${40 + ((index * 37) % 55)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
