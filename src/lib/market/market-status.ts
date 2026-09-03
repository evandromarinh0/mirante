import { isHoliday, SAO_PAULO_UTC_OFFSET_HOURS, SESSION } from './b3-calendar';

/**
 * "O pregão está aberto?" — função pura, e a mais testada do projeto.
 *
 * Recebe `now` em vez de ler o relógio, porque status de mercado é a lógica
 * que mais precisa de teste determinístico e a que mais quebra em produção
 * quando depende de `Date.now()` escondido.
 */

export type MarketPhase = 'open' | 'pre-open' | 'closed';

export interface MarketStatus {
  readonly phase: MarketPhase;
  readonly isOpen: boolean;
  /** Fim da última sessão concluída. */
  readonly lastClose: Date;
  /** Início da próxima sessão. Igual a `lastClose` nunca acontece. */
  readonly nextOpen: Date;
}

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** Mesmo instante, deslocado para poder ler as partes locais via UTC. */
function toSaoPaulo(instant: Date): Date {
  return new Date(instant.getTime() + SAO_PAULO_UTC_OFFSET_HOURS * HOUR_MS);
}

function fromSaoPaulo(shifted: Date): Date {
  return new Date(shifted.getTime() - SAO_PAULO_UTC_OFFSET_HOURS * HOUR_MS);
}

function isoDay(shifted: Date): string {
  return shifted.toISOString().slice(0, 10);
}

function isTradingDay(shifted: Date): boolean {
  const weekday = shifted.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !isHoliday(isoDay(shifted));
}

function atMinutes(shifted: Date, minutes: number): Date {
  const midnight = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    0,
    0,
    0,
    0,
  );
  return new Date(midnight + minutes * MINUTE_MS);
}

function previousTradingDay(shifted: Date): Date {
  let cursor = new Date(shifted.getTime() - 86_400_000);
  // Feriado emendado em fim de semana pode encadear vários dias.
  while (!isTradingDay(cursor)) cursor = new Date(cursor.getTime() - 86_400_000);
  return cursor;
}

function nextTradingDay(shifted: Date): Date {
  let cursor = new Date(shifted.getTime() + 86_400_000);
  while (!isTradingDay(cursor)) cursor = new Date(cursor.getTime() + 86_400_000);
  return cursor;
}

export function getMarketStatus(now: Date): MarketStatus {
  const local = toSaoPaulo(now);
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  const tradingToday = isTradingDay(local);

  const phase: MarketPhase = !tradingToday
    ? 'closed'
    : minutes >= SESSION.openMinutes && minutes < SESSION.closeMinutes
      ? 'open'
      : minutes >= SESSION.preOpenStartMinutes && minutes < SESSION.openMinutes
        ? 'pre-open'
        : 'closed';

  const closedToday = tradingToday && minutes >= SESSION.closeMinutes;

  const lastCloseLocal = closedToday
    ? atMinutes(local, SESSION.closeMinutes)
    : atMinutes(previousTradingDay(local), SESSION.closeMinutes);

  const openTodayStillAhead = tradingToday && minutes < SESSION.openMinutes;

  const nextOpenLocal = openTodayStillAhead
    ? atMinutes(local, SESSION.openMinutes)
    : atMinutes(nextTradingDay(local), SESSION.openMinutes);

  return {
    phase,
    isOpen: phase === 'open',
    lastClose: fromSaoPaulo(lastCloseLocal),
    nextOpen: fromSaoPaulo(nextOpenLocal),
  };
}
