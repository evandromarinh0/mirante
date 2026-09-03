/**
 * Calendário da B3.
 *
 * O Brasil não tem horário de verão desde 2019, então `America/Sao_Paulo` é
 * UTC−3 fixo. Isso elimina a classe de bug mais comum aqui e permite aritmética
 * de fuso sem biblioteca.
 */

export const SAO_PAULO_UTC_OFFSET_HOURS = -3;

/** Sessão do mercado a vista, incluindo o call de fechamento (16:55–17:00). */
export const SESSION = {
  preOpenStartMinutes: 9 * 60 + 30,
  openMinutes: 10 * 60,
  closeMinutes: 17 * 60,
} as const;

/**
 * Feriados nacionais de data fixa. São de lei e não mudam de ano para ano.
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
  '12-25', // Natal
] as const;

/**
 * Fechamentos que não dão para derivar: exceções da B3, pregão parcial e
 * feriados cuja vigência mudou (Consciência Negra, feriados municipais que a
 * bolsa deixou de observar).
 *
 * **Deliberadamente vazio.** Precisa ser transcrito do calendário oficial da B3
 * antes do deploy — a página pública só publica os anos anteriores, e inventar
 * data aqui produziria "mercado fechado" errado em produção. Enquanto estiver
 * vazio, o status erra apenas nesses dias específicos, e erra dizendo "aberto".
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

/** Feriados móveis: derivam da Páscoa, então são calculados, não transcritos. */
export function movableHolidays(year: number): readonly string[] {
  const { month, day } = easterSunday(year);
  const easter = new Date(Date.UTC(year, month - 1, day));
  return [
    toIsoDay(addDays(easter, -48)), // segunda de carnaval
    toIsoDay(addDays(easter, -47)), // terça de carnaval
    toIsoDay(addDays(easter, -2)), // sexta-feira santa
    toIsoDay(addDays(easter, 60)), // corpus christi
  ];
}

/** `date` deve ser um dia já expresso em horário de São Paulo. */
export function isHoliday(isoDay: string): boolean {
  const year = Number(isoDay.slice(0, 4));
  const monthDay = isoDay.slice(5);
  return (
    (FIXED_HOLIDAYS as readonly string[]).includes(monthDay) ||
    movableHolidays(year).includes(isoDay) ||
    MANUAL_CLOSURES.includes(isoDay)
  );
}
