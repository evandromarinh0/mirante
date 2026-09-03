import { cn } from '@/lib/cn';
import { formatClock, formatDayMonth, formatRelativeTime, formatWeekday } from '@/lib/format';
import type { MarketStatus } from '@/lib/market/market-status';
import type { DataOrigin } from '@/lib/market/result';

/**
 * O carimbo de honestidade. Toda tela que mostra número mostra isto.
 *
 * Diz "consultado", não "atualizado": a fonte não devolve o horário do pregão
 * na listagem, então afirmar a hora da cotação seria inventar precisão. O que
 * sabemos com certeza é quando **nós** consultamos.
 */

interface DataStampProps {
  readonly origin: DataOrigin;
  readonly status: MarketStatus;
  readonly now?: Date;
  readonly className?: string;
}

const PHASE_LABEL = {
  open: 'Mercado aberto',
  'pre-open': 'Pré-abertura',
  closed: 'Mercado fechado',
} as const;

export function DataStamp({ origin, status, now = new Date(), className }: DataStampProps) {
  const closedSince = `fechamento de ${formatWeekday(status.lastClose)}, ${formatDayMonth(
    status.lastClose,
  )}, ${formatClock(status.lastClose)}`;

  return (
    <p className={cn('text-text-muted flex flex-wrap items-center gap-x-2 text-xs', className)}>
      <span className="text-text-secondary inline-flex items-center gap-1.5 font-medium">
        <span
          aria-hidden="true"
          className={cn(
            'size-1.5 rounded-full',
            status.isOpen ? 'bg-positive' : 'bg-border-strong',
          )}
        />
        {PHASE_LABEL[status.phase]}
      </span>

      <span aria-hidden="true">·</span>

      {status.isOpen ? (
        <span>
          consultado{' '}
          <time dateTime={origin.fetchedAt}>{formatRelativeTime(origin.fetchedAt, now)}</time>
        </span>
      ) : (
        <span>{closedSince}</span>
      )}

      {origin.fallback && (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-negative font-medium">dado de reserva</span>
        </>
      )}
    </p>
  );
}

/**
 * Aviso de fallback. Aparece quando a fonte viva não respondeu e a tela está
 * sendo servida pelo snapshot versionado.
 *
 * A regra que ele materializa: ninguém encontra tela de erro, e ninguém vê dado
 * velho apresentado como fresco.
 */
export function FallbackNotice({ origin }: { readonly origin: DataOrigin }) {
  if (!origin.fallback) return null;

  return (
    <aside
      // Não é `alert`: o conteúdo está na tela e utilizável, isto é contexto.
      role="note"
      className="border-border bg-bg-subtle text-text-secondary rounded-md border px-3 py-2 text-sm"
    >
      <strong className="text-text font-medium">Dado de reserva.</strong> A fonte não respondeu
      agora, então estes preços são de{' '}
      <time dateTime={origin.fetchedAt}>
        {formatDayMonth(origin.fetchedAt)}, {formatClock(origin.fetchedAt)}
      </time>
      . Não são a cotação de agora.
    </aside>
  );
}
