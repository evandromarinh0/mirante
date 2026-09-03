'use client';

import { cn } from '@/lib/cn';
import { useWatchlistContext } from './watchlist-provider';

/**
 * Botão de acompanhar.
 *
 * `aria-pressed` em vez de trocar o rótulo, para que leitor de tela anuncie
 * estado e não uma frase diferente a cada clique. Antes da hidratação o botão
 * fica desabilitado: o servidor não sabe o que há no `localStorage`, e um botão
 * que mostra "não acompanhado" e muda sozinho depois é pior que um botão que
 * espera um instante.
 */
export function WatchButton({
  symbol,
  className,
}: {
  readonly symbol: string;
  readonly className?: string;
}) {
  const { has, toggle, hydrated } = useWatchlistContext();
  const active = hydrated && has(symbol);

  return (
    <button
      type="button"
      onClick={() => toggle(symbol)}
      disabled={!hydrated}
      aria-pressed={active}
      aria-label={`Acompanhar ${symbol}`}
      className={cn(
        'hit-area-min text-text-muted hover:text-accent inline-flex items-center justify-center rounded-sm p-1 transition-colors duration-[var(--duration-fast)] disabled:opacity-40',
        active && 'text-accent',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 3.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.65l5.9-.85z" />
      </svg>
    </button>
  );
}
