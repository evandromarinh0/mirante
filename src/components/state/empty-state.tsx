import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Estado vazio. A regra: dizer **por que** está vazio e oferecer um caminho de
 * um clique. "Nenhum resultado" sozinho transfere o problema para quem lê.
 */

interface EmptyStateProps {
  readonly title: string;
  readonly description: ReactNode;
  readonly action?: { readonly href: Route; readonly label: string };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="border-border bg-bg-subtle rounded-md border border-dashed px-5 py-8 text-center">
      <p className="text-text text-base font-medium">{title}</p>
      <p className="text-text-secondary mx-auto mt-1.5 max-w-[46ch] text-sm">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="text-accent hover:text-accent-hover hit-area mt-3 inline-flex items-center justify-center text-sm font-medium underline decoration-1 underline-offset-2"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
