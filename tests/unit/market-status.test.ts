import { describe, expect, it } from 'vitest';
import { easterSunday, isHoliday, movableHolidays } from '@/lib/market/b3-calendar';
import { getMarketStatus } from '@/lib/market/market-status';

/**
 * `getMarketStatus` é a função mais testada do projeto porque é a que mais
 * quebra em produção: fuso, virada de dia, fim de semana e feriado emendado.
 *
 * Os instantes são escritos em UTC de propósito — São Paulo é UTC−3, então
 * 13:00Z é 10:00 local, a abertura.
 */

describe('getMarketStatus', () => {
  it('está aberto às 10:00 de um dia útil', () => {
    // quinta, 3 de setembro de 2026
    const status = getMarketStatus(new Date('2026-09-03T13:00:00Z'));
    expect(status.phase).toBe('open');
    expect(status.isOpen).toBe(true);
  });

  it('está aberto às 16:59 e fechado às 17:00', () => {
    expect(getMarketStatus(new Date('2026-09-03T19:59:00Z')).isOpen).toBe(true);
    expect(getMarketStatus(new Date('2026-09-03T20:00:00Z')).isOpen).toBe(false);
  });

  it('marca pré-abertura entre 09:30 e 10:00', () => {
    const status = getMarketStatus(new Date('2026-09-03T12:40:00Z'));
    expect(status.phase).toBe('pre-open');
    expect(status.isOpen).toBe(false);
  });

  it('está fechado no sábado e no domingo', () => {
    expect(getMarketStatus(new Date('2026-09-05T13:00:00Z')).phase).toBe('closed');
    expect(getMarketStatus(new Date('2026-09-06T13:00:00Z')).phase).toBe('closed');
  });

  it('está fechado em feriado de data fixa', () => {
    // 7 de setembro de 2026 é uma segunda-feira
    expect(getMarketStatus(new Date('2026-09-07T13:00:00Z')).phase).toBe('closed');
  });

  it('no sábado, aponta o último fechamento para a sexta às 17:00', () => {
    const status = getMarketStatus(new Date('2026-09-05T15:00:00Z'));
    expect(status.lastClose.toISOString()).toBe('2026-09-04T20:00:00.000Z');
  });

  it('no domingo, a próxima abertura é segunda às 10:00', () => {
    const status = getMarketStatus(new Date('2026-09-13T15:00:00Z'));
    expect(status.nextOpen.toISOString()).toBe('2026-09-14T13:00:00.000Z');
  });

  it('pula o feriado ao calcular a próxima abertura', () => {
    // domingo, 6 de setembro; segunda 7 é feriado, então abre na terça 8
    const status = getMarketStatus(new Date('2026-09-06T15:00:00Z'));
    expect(status.nextOpen.toISOString()).toBe('2026-09-08T13:00:00.000Z');
  });

  it('antes da abertura, o último fechamento é o do dia útil anterior', () => {
    const status = getMarketStatus(new Date('2026-09-03T11:00:00Z'));
    expect(status.lastClose.toISOString()).toBe('2026-09-02T20:00:00.000Z');
  });

  it('depois do fechamento, o último fechamento é o do próprio dia', () => {
    const status = getMarketStatus(new Date('2026-09-03T21:00:00Z'));
    expect(status.lastClose.toISOString()).toBe('2026-09-03T20:00:00.000Z');
  });
});

describe('calendário', () => {
  it('calcula a Páscoa de anos conhecidos', () => {
    expect(easterSunday(2026)).toEqual({ month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ month: 3, day: 28 });
  });

  it('deriva carnaval, sexta-feira santa e corpus christi da Páscoa', () => {
    const holidays = movableHolidays(2026);
    expect(holidays).toContain('2026-02-16');
    expect(holidays).toContain('2026-02-17');
    expect(holidays).toContain('2026-04-03');
    expect(holidays).toContain('2026-06-04');
  });

  it('reconhece feriado fixo em qualquer ano', () => {
    expect(isHoliday('2026-12-25')).toBe(true);
    expect(isHoliday('2027-12-25')).toBe(true);
    expect(isHoliday('2026-12-26')).toBe(false);
  });
});
