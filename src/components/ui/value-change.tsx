import { cn } from '@/lib/cn';
import { formatDirection, formatPercent, formatSignedCurrency } from '@/lib/format';

/**
 * Variação de preço.
 *
 * **Cor nunca informa sozinha.** Todo valor leva sinal e seta, porque cor
 * sozinha falha em daltonismo, falha impressa e falha em captura em escala de
 * cinza — e é obrigação do WCAG 1.4.1. A seta é decorativa para leitor de tela;
 * o sinal já está no texto.
 */

const ARROW = { up: '▲', down: '▼', flat: '–' } as const;

const TONE = {
  up: 'text-positive',
  down: 'text-negative',
  flat: 'text-text-muted',
} as const;

interface ValueChangeProps {
  readonly value: number;
  readonly percent: number;
  /** `percent` mostra só o percentual — é o que cabe na tabela em 320px. */
  readonly display?: 'percent' | 'both';
  readonly className?: string;
}

export function ValueChange({ value, percent, display = 'percent', className }: ValueChangeProps) {
  const direction = formatDirection(percent);

  return (
    <span className={cn('tabular inline-flex items-baseline gap-1', TONE[direction], className)}>
      <span aria-hidden="true" className="text-[0.7em]">
        {ARROW[direction]}
      </span>
      {display === 'both' && <span>{formatSignedCurrency(value)}</span>}
      <span>{formatPercent(percent)}</span>
    </span>
  );
}
