import { describe, expect, it } from 'vitest';
import { formatPercent, formatRelativeTime, formatSignedCurrency } from '@/lib/format';
import { isValidSymbol, normalizeSymbol } from '@/lib/market/provider';
import { toCandle, toFailureReason, toInstrument } from '@/lib/market/providers/brapi/mappers';
import { resolveProviderId } from '@/lib/market/providers';
import { computeStats } from '@/lib/services/market-service';
import { fixtureProvider } from '@/lib/market/providers/fixture-provider';

/**
 * O que este arquivo protege: a fronteira. Mapeamento de campo de terceiro,
 * classificação de ativo, tradução de erro e seleção de provider — as quatro
 * coisas que, se quebrarem em silêncio, produzem número errado na tela.
 */

describe('mapeamento da fonte para o domínio', () => {
  it('classifica ação, FII e descarta o que não é nenhum dos dois', () => {
    expect(toInstrument({ stock: 'PETR4', close: 48.2, type: 'stock' })?.kind).toBe('stock');
    expect(toInstrument({ stock: 'HGLG11', close: 147, type: 'fund', subType: 'fii' })?.kind).toBe(
      'reit',
    );
    // ETF e BDR usam o mesmo endpoint e não fazem parte do universo do produto.
    expect(toInstrument({ stock: 'BOVA11', close: 130, type: 'fund', subType: 'etf' })).toBeNull();
    expect(toInstrument({ stock: 'AAPL34', close: 60, type: 'bdr', subType: 'bdr' })).toBeNull();
  });

  it('descarta ativo sem preço em vez de mostrar célula vazia', () => {
    expect(toInstrument({ stock: 'XPTO3', close: null, type: 'stock' })).toBeNull();
  });

  it('deriva a variação em reais a partir do percentual e do fechamento', () => {
    // 100 depois de subir 25% veio de 80: a variação em reais é 20.
    const mapped = toInstrument({ stock: 'TEST4', close: 100, change: 25, type: 'stock' });
    expect(mapped?.change).toBeCloseTo(20, 6);
  });

  it('usa o ticker quando a fonte não devolve nome', () => {
    expect(toInstrument({ stock: 'MXRF11', close: 9.4, type: 'fund', subType: 'fii' })?.name).toBe(
      'MXRF11',
    );
  });

  it('converte epoch em ISO e descarta candle incompleto', () => {
    const candle = toCandle({
      date: 1_772_496_000,
      open: 1,
      high: 2,
      low: 0.5,
      close: 1.5,
      volume: 9,
    });
    expect(candle?.date).toBe('2026-03-03T00:00:00.000Z');
    expect(toCandle({ date: 1_772_496_000, open: 1, high: 2, low: 0.5, close: null })).toBeNull();
  });

  it('traduz status e código de erro para motivo de domínio', () => {
    expect(toFailureReason(429, 'RATE_LIMITED')).toBe('rate-limited');
    expect(toFailureReason(404, 'NOT_FOUND')).toBe('not-found');
    // Recurso de plano pago é indisponibilidade, não erro de quem visita.
    expect(toFailureReason(403, 'FEATURE_NOT_AVAILABLE')).toBe('unavailable');
    expect(toFailureReason(400, 'INVALID_RANGE')).toBe('unavailable');
  });
});

describe('validação de ticker', () => {
  /**
   * Os casos vêm da classificação dos 1.120 ativos do universo por forma
   * estrutural, não de suposição sobre "como é um ticker".
   */
  it.each([
    ['PETR4', 'ação, classe de um dígito'],
    ['HGLG11', 'FII, classe de dois dígitos'],
    ['ABCB10', 'ação com classe de dois dígitos'],
    ['B3SA3', 'dígito na raiz — a ação da própria B3'],
    ['B1003', 'raiz quase toda numérica'],
    ['P2NB34', 'dígito na raiz e classe de dois dígitos'],
  ])('aceita %s (%s)', (symbol) => {
    expect(isValidSymbol(symbol)).toBe(true);
  });

  it.each([
    ['petr4', 'minúscula'],
    ['../etc/passwd', 'caminho'],
    ['PETR4;DROP', 'injeção'],
    ['PETR4 ', 'espaço à direita'],
    ['1PETR4', 'começa com dígito'],
    ['PETR', 'sem dígito de classe'],
    ['BRAX', 'sem dígito de classe, e a fonte devolve assim'],
    ['PETR456', 'três dígitos de classe'],
    ['PET4', 'raiz de três caracteres'],
    ['PETRO4', 'raiz de cinco caracteres'],
    ['', 'vazio'],
  ])('rejeita %o (%s)', (symbol) => {
    expect(isValidSymbol(symbol)).toBe(false);
  });

  it('rejeita o sufixo de mercado fracionário — decisão ainda em aberto', () => {
    // Os 406 tickers com sufixo F/B/BF continuam fora até haver decisão de
    // produto sobre incluí-los ou removê-los do universo. Este teste marca a
    // fronteira atual: se a decisão mudar, ele muda junto, de propósito.
    expect(isValidSymbol('PETR4F')).toBe(false);
    expect(isValidSymbol('EQMA3BF')).toBe(false);
  });

  it('normaliza antes de validar', () => {
    expect(isValidSymbol(normalizeSymbol(' petr4 '))).toBe(true);
    expect(isValidSymbol(normalizeSymbol(' b3sa3 '))).toBe(true);
  });

  it('aceita todo ticker canônico do universo versionado', async () => {
    // O teste que teria pego o defeito: em vez de exemplos escolhidos à mão,
    // confronta o validador com o dado que o produto realmente exibe.
    const { readFileSync } = await import('node:fs');
    const snapshot = JSON.parse(readFileSync('src/data/universe-snapshot.json', 'utf8')) as {
      instruments: readonly { symbol: string }[];
    };

    const suffixed = /[BF]$/;
    const canonical = snapshot.instruments
      .map((instrument) => instrument.symbol)
      .filter((symbol) => !suffixed.test(symbol) && symbol !== 'BRAX');

    const rejected = canonical.filter((symbol) => !isValidSymbol(symbol));
    expect(
      rejected,
      `o validador rejeita tickers que a tabela exibe: ${rejected.join(', ')}`,
    ).toEqual([]);
  });
});

describe('seleção de provider', () => {
  it('usa fixture quando não há token', () => {
    expect(resolveProviderId(undefined, false)).toBe('fixture');
  });

  it('usa brapi quando há token e nada configurado', () => {
    expect(resolveProviderId(undefined, true)).toBe('brapi');
  });

  it('degrada para fixture se pedirem brapi sem token', () => {
    expect(resolveProviderId('brapi', false)).toBe('fixture');
  });

  it('respeita a configuração explícita', () => {
    expect(resolveProviderId('snapshot', true)).toBe('snapshot');
    expect(resolveProviderId('lixo', true)).toBe('brapi');
  });
});

describe('provider de fixture', () => {
  it('devolve universo real capturado, com as duas classes', async () => {
    const result = await fixtureProvider.listUniverse();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.length).toBeGreaterThan(10);
    expect(result.data.some((row) => row.kind === 'reit')).toBe(true);
    expect(result.data.some((row) => row.kind === 'stock')).toBe(true);
  });

  it('recusa ticker inválido antes de procurar', async () => {
    const result = await fixtureProvider.getHistory('nope', '3mo');
    expect(result).toMatchObject({ ok: false, reason: 'invalid-symbol' });
  });

  it('devolve não-encontrado para ticker sem série na fixture', async () => {
    const result = await fixtureProvider.getHistory('ABCD3', '3mo');
    expect(result).toMatchObject({ ok: false, reason: 'not-found' });
  });
});

describe('estatísticas do período', () => {
  it('calcula abertura, extremos, variação e volume médio', () => {
    const stats = computeStats({
      symbol: 'TEST4',
      range: '1mo',
      candles: [
        { date: '2026-01-01T00:00:00.000Z', open: 10, high: 12, low: 9, close: 11, volume: 100 },
        { date: '2026-01-02T00:00:00.000Z', open: 11, high: 15, low: 8, close: 14, volume: 300 },
      ],
    });

    expect(stats).toEqual({
      open: 10,
      close: 14,
      high: 15,
      low: 8,
      change: 4,
      changePercent: 40,
      averageVolume: 200,
    });
  });

  it('devolve nulo para série vazia em vez de dividir por zero', () => {
    expect(computeStats({ symbol: 'TEST4', range: '1mo', candles: [] })).toBeNull();
  });
});

describe('formatação pt-BR', () => {
  it('usa vírgula decimal e sinal explícito', () => {
    expect(formatSignedCurrency(1234.5)).toMatch(/^\+R\$\s?1\.234,50$/);
    expect(formatSignedCurrency(-2.5)).toMatch(/^−R\$\s?2,50$/);
    expect(formatPercent(2.8)).toBe('+2,80%');
    expect(formatPercent(-1.2)).toBe('-1,20%');
    expect(formatPercent(0)).toBe('0,00%');
  });

  it('descreve o tempo decorrido com granularidade grossa', () => {
    const now = new Date('2026-09-03T12:00:00Z');
    expect(formatRelativeTime('2026-09-03T11:59:30Z', now)).toBe('agora');
    expect(formatRelativeTime('2026-09-03T11:58:00Z', now)).toBe('há 2 minutos');
    expect(formatRelativeTime('2026-09-03T09:00:00Z', now)).toBe('há 3 horas');
    expect(formatRelativeTime('2026-09-01T12:00:00Z', now)).toBe('há 2 dias');
  });
});
