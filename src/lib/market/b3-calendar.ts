/**
 * Calendário da B3.
 *
 * O Brasil não tem horário de verão desde 2019, então `America/Sao_Paulo` é
 * UTC−3 fixo. Isso elimina a classe de bug mais comum aqui e permite aritmética
 * de fuso sem biblioteca.
 *
 * Fonte das datas: calendário de negociação da B3 para 2026, publicado em
 * b3.com.br/pt_br/noticias/calendario-de-negociacao-da-b3-confira-o-funcionamento-da-bolsa-em-2026.htm
 *
 * A B3 publica esse calendário todo ano e avisa que ele pode mudar no meio do
 * caminho. O que dá para derivar (feriado de data fixa e feriado móvel ligado à
 * Páscoa) fica calculado; o que é prática da bolsa fica em tabela, com a fonte
 * ao lado. **Nada de data chutada:** status de mercado errado é pior que status
 * ausente.
 */

export const SAO_PAULO_UTC_OFFSET_HOURS = -3;

/** Sessão do mercado a vista, incluindo o call de fechamento (16:55–17:00). */
export const SESSION = {
  preOpenStartMinutes: 9 * 60 + 30,
  openMinutes: 10 * 60,
  closeMinutes: 17 * 60,
} as const;

/**
 * Feriados nacionais de data fixa. São de lei e valem todo ano.
 * Formato `MM-DD`.
 */
const FIXED_HOLIDAYS = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Zumbi e Consciência Negra — nacional pela Lei 14.759/2023
  '12-25', // Natal
] as const;

/**
 * Dias sem sessão de negociação que **não** são feriado nacional: é prática da
 * B3, confirmada no calendário de 2026. Em 24 e 31 de dezembro há expediente
 * bancário e registro de balcão, mas não há pregão.
 */
const B3_CLOSURES = ['12-24', '12-31'] as const;

/**
 * Exceções que só o calendário do ano revela — mudança de data, fechamento
 * extraordinário, feriado que a bolsa deixou de observar.
 *
 * Deliberadamente vazio: no calendário de 2026 não há nenhuma. Vale registrar o
 * caso que mais confunde — **9 de julho, Revolução Constitucionalista, opera
 * normalmente**: é feriado no estado de São Paulo, e a B3 não o observa mais.
 */
export const MANUAL_CLOSURES: readonly string[] = [];

/** Domingo de Páscoa pelo algoritmo de Meeus/Butcher — determinístico. */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

const DAY_MS = 86_400_000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function easterDate(year: number): Date {
  const { month, day } = easterSunday(year);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Feriados móveis: derivam da Páscoa, então são calculados, não transcritos. */
export function movableHolidays(year: number): readonly string[] {
  const easter = easterDate(year);
  return [
    toIsoDay(addDays(easter, -48)), // segunda de carnaval
    toIsoDay(addDays(easter, -47)), // terça de carnaval
    toIsoDay(addDays(easter, -2)), // sexta-feira santa
    toIsoDay(addDays(easter, 60)), // corpus christi
  ];
}

/** Quarta-feira de cinzas: Páscoa menos 46 dias. */
export function ashWednesday(year: number): string {
  return toIsoDay(addDays(easterDate(year), -46));
}

/**
 * Abertura atrasada da quarta-feira de cinzas: pré-abertura 12:45, negociação a
 * partir de 13:00. Confirmado no calendário de 2026 e prática recorrente.
 */
const ASH_WEDNESDAY_SESSION = {
  preOpenStartMinutes: 12 * 60 + 45,
  openMinutes: 13 * 60,
} as const;

/** Horário de abertura do dia, quando difere do padrão. */
export function sessionOverride(
  isoDay: string,
): { preOpenStartMinutes: number; openMinutes: number } | null {
  const year = Number(isoDay.slice(0, 4));
  return isoDay === ashWednesday(year) ? ASH_WEDNESDAY_SESSION : null;
}

/** `isoDay` precisa estar no dia já expresso em horário de São Paulo. */
export function isHoliday(isoDay: string): boolean {
  const year = Number(isoDay.slice(0, 4));
  const monthDay = isoDay.slice(5);
  return (
    (FIXED_HOLIDAYS as readonly string[]).includes(monthDay) ||
    (B3_CLOSURES as readonly string[]).includes(monthDay) ||
    movableHolidays(year).includes(isoDay) ||
    MANUAL_CLOSURES.includes(isoDay)
  );
}
