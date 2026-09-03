import { describe, expect, it, vi } from 'vitest';
import { getMarketStatus } from '@/lib/market/market-status';
import { fail, ok, type DataOrigin, type Result } from '@/lib/market/result';
import { composeOverview, withFallback } from '@/lib/services/market-service';
import type { Instrument } from '@/lib/market/types';

/**
 * O fallback é a regra que sustenta "ninguém encontra tela de erro", e até agora
 * nenhum teste passava pelos dois ramos dela. A composição do estado também não
 * era testada — e era ali que estava o `throw` que contradizia o `Result`.
 */

const NOW = new Date('2026-09-03T13:00:00Z');

const origin = (provider: DataOrigin['provider'], fallback = false): DataOrigin => ({
  provider,
  fetchedAt: NOW.toISOString(),
  fallback,
});

const instrument: Instrument = {
  symbol: 'PETR4',
  name: 'PETROBRAS PN',
  kind: 'stock',
  price: 48.2,
  change: 1.33,
  changePercent: 2.84,
  volume: 100,
  sector: 'Energy',
};

describe('withFallback', () => {
  it('não chama o fallback quando a fonte responde', async () => {
    const fallback = vi.fn(async (): Promise<Result<number>> => ok(2, origin('snapshot', true)));
    const result = await withFallback(async () => ok(1, origin('brapi')), fallback);

    expect(result).toMatchObject({ ok: true, data: 1 });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('cai no fallback quando a fonte está indisponível', async () => {
    const result = await withFallback(
      async () => fail<number>('unavailable'),
      async () => ok(2, origin('snapshot', true)),
    );

    expect(result).toMatchObject({ ok: true, data: 2 });
    if (result.ok) expect(result.origin.fallback).toBe(true);
  });

  it.each(['rate-limited', 'quota-exhausted'] as const)(
    'cai no fallback também em %s',
    async (reason) => {
      const fallback = vi.fn(async (): Promise<Result<number>> => ok(2, origin('snapshot', true)));
      await withFallback(async () => fail<number>(reason), fallback);
      expect(fallback).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['not-found', 'invalid-symbol'] as const)(
    'não usa o fallback em %s: é a resposta correta',
    async (reason) => {
      const fallback = vi.fn(async (): Promise<Result<number>> => ok(2, origin('snapshot', true)));
      const result = await withFallback(async () => fail<number>(reason), fallback);

      expect(result).toMatchObject({ ok: false, reason });
      expect(fallback).not.toHaveBeenCalled();
    },
  );

  it('propaga a falha quando nem o fallback responde — sem lançar', async () => {
    const result = await withFallback(
      async () => fail<number>('unavailable'),
      async () => fail<number>('unavailable'),
    );

    expect(result).toMatchObject({ ok: false, reason: 'unavailable' });
  });
});

describe('composeOverview', () => {
  const status = getMarketStatus(NOW);

  it('sucesso carrega os ativos e a procedência', () => {
    const overview = composeOverview(ok([instrument], origin('brapi')), status);

    expect(overview.ok).toBe(true);
    if (!overview.ok) return;
    expect(overview.instruments).toHaveLength(1);
    expect(overview.origin.provider).toBe('brapi');
  });

  it('falha vira estado com motivo, e não exceção', () => {
    // Era exatamente aqui que existia um `throw`, que entregava a tela de erro
    // do framework em vez de um estado que a página sabe desenhar.
    expect(() => composeOverview(fail('unavailable'), status)).not.toThrow();
    expect(composeOverview(fail('unavailable'), status)).toMatchObject({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('mesmo em falha, o status da sessão continua disponível', () => {
    const overview = composeOverview(fail('quota-exhausted'), status);
    expect(overview.status.phase).toBe('open');
  });
});
