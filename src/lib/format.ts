/**
 * Formatação pt-BR. Interface em português é decisão registrada
 * (portfólio, docs/decisions/0006), e formatação errada de moeda é o tipo de
 * detalhe que desqualifica um produto financeiro no primeiro olhar.
 *
 * Os formatadores são criados uma vez: `Intl.NumberFormat` é caro, e a tabela
 * de mercado formata milhares de células.
 */

const TIME_ZONE = 'America/Sao_Paulo';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

const compact = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const dayMonth = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  timeZone: TIME_ZONE,
});

const dayMonthTime = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});

const clock = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
});

const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: TIME_ZONE });

export function formatCurrency(value: number): string {
  return currency.format(value);
}

/** Variação em reais: o sinal é explícito, porque cor nunca informa sozinha. */
export function formatSignedCurrency(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${currency.format(Math.abs(value))}`;
}

export function formatPercent(value: number): string {
  return `${percent.format(value)}%`;
}

/** Volume em notação compacta: a coluna precisa caber em 320px. */
export function formatVolume(value: number): string {
  return compact.format(value);
}

export function formatDayMonth(iso: string | Date): string {
  return dayMonth.format(new Date(iso));
}

export function formatDayMonthTime(iso: string | Date): string {
  return dayMonthTime.format(new Date(iso));
}

export function formatClock(iso: string | Date): string {
  return clock.format(new Date(iso));
}

export function formatWeekday(iso: string | Date): string {
  return weekday.format(new Date(iso));
}

/**
 * "há 3 minutos". Granularidade grossa de propósito: precisão de segundo em
 * carimbo de atualização é ruído, e obrigaria a re-renderizar sem motivo.
 */
export function formatRelativeTime(from: string | Date, now: Date = new Date()): string {
  const elapsedMs = now.getTime() - new Date(from).getTime();
  const minutes = Math.floor(elapsedMs / 60_000);

  if (minutes < 1) return 'agora';
  if (minutes === 1) return 'há 1 minuto';
  if (minutes < 60) return `há ${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'há 1 hora';
  if (hours < 24) return `há ${hours} horas`;

  const days = Math.floor(hours / 24);
  return days === 1 ? 'há 1 dia' : `há ${days} dias`;
}

export function formatDirection(value: number): 'up' | 'down' | 'flat' {
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'flat';
}
