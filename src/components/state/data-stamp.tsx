import { cn } from '@/lib/cn';
import { formatClock, formatDayMonth, formatRelativeTime, formatWeekday } from '@/lib/format';
import type { MarketStatus } from '@/lib/market/market-status';
import { isLiveData, type DataOrigin } from '@/lib/market/result';

/**
 * O carimbo de honestidade. Toda tela que mostra número mostra isto.
 *
 * Diz "consultado", não "atualizado": a fonte não devolve o horário do pregão na
 * listagem, então afirmar a hora da cotação seria inventar precisão. O que
 * sabemos com certeza é quando **nós** consultamos.
 *
 * Três procedências, e nenhuma se disfarça de outra: ao vivo, exemplo (dado
 * capturado, de desenvolvimento) e reserva (a fonte falhou).
 */

interface DataStampProps {
  /** Nulo quando nem o fallback respondeu: a sessão ainda é informação. */
  readonly origin: DataOrigin | null;
  readonly status: MarketStatus;
  readonly now?: Date;
  readonly className?: string;
}

const PHASE_LABEL = {
  open: 'Mercado aberto',
  'pre-open': 'Pré-abertura',
  closed: 'Mercado fechado',
} as const;

const SOURCE_LABEL = {
  fixture: 'dado de exemplo',
  snapshot: 'dado de reserva',
} as const;

export function DataStamp({ origin, status, now = new Date(), className }: DataStampProps) {
  const live = origin !== null && isLiveData(origin);
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
            status.isOpen && live ? 'bg-positive' : 'bg-border-strong',
          )}
        />
        {PHASE_LABEL[status.phase]}
      </span>

      {origin !== null && <span aria-hidden="true">·</span>}

      {/* Três frases distintas, porque três situações distintas. Dizer
          "fechamento de quarta" ao lado de "mercado aberto" — o que acontecia
          quando o dado não era ao vivo — é contradição na cara de quem lê.
          Sem procedência nenhuma, o carimbo diz só a fase da sessão. */}
      {origin === null ? null : !live ? (
        <span>
          capturado em{' '}
          <time dateTime={origin.fetchedAt}>
            {formatDayMonth(origin.fetchedAt)}, {formatClock(origin.fetchedAt)}
          </time>
        </span>
      ) : status.isOpen ? (
        <span>
          consultado{' '}
          <time dateTime={origin.fetchedAt}>{formatRelativeTime(origin.fetchedAt, now)}</time>
        </span>
      ) : (
        <span>{closedSince}</span>
      )}

      {origin !== null && !live && origin.provider !== 'brapi' && (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-negative font-medium">{SOURCE_LABEL[origin.provider]}</span>
        </>
      )}

      {origin !== null && !live && origin.provider === 'brapi' && (
        <>
          <span aria-hidden="true">·</span>
          <span className="text-negative font-medium">dado de reserva</span>
        </>
      )}
    </p>
  );
}

/**
 * Aviso de procedência. Aparece sempre que o dado na tela **não** é o mercado ao
 * vivo, e diz qual dos dois casos é.
 *
 * A regra que ele materializa: ninguém encontra tela de erro, e ninguém vê dado
 * velho apresentado como fresco. O segundo caso é o que dói mais, porque é
 * silencioso.
 */
export function DataOriginNotice({ origin }: { readonly origin: DataOrigin | null }) {
  if (origin === null || isLiveData(origin)) return null;

  const captured = (
    <time dateTime={origin.fetchedAt}>
      {formatDayMonth(origin.fetchedAt)}, {formatClock(origin.fetchedAt)}
    </time>
  );

  return (
    <aside
      // Não é `alert`: o conteúdo está na tela e utilizável, isto é contexto.
      role="note"
      className="border-border bg-bg-subtle text-text-secondary rounded-md border px-3 py-2 text-sm"
    >
      {origin.provider === 'fixture' ? (
        <>
          <strong className="text-text font-medium">Dado de exemplo.</strong> Esta instalação está
          servindo o conjunto capturado em {captured}, com um recorte do mercado — não é o mercado
          ao vivo.
        </>
      ) : (
        <>
          <strong className="text-text font-medium">Dado de reserva.</strong> A fonte não respondeu
          agora, então estes preços são de {captured}. Não são a cotação de agora.
        </>
      )}
    </aside>
  );
}
