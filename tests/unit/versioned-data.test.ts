import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { seriesFileSchema, universeFileSchema } from '@/lib/market/schemas';

/**
 * Portão dos dados versionados.
 *
 * O produto valida a resposta da Brapi com Zod na fronteira, mas o snapshot e as
 * fixtures — que também são entrada de dados — entram por asserção de tipo
 * (`as readonly Instrument[]`). Asserção não verifica nada: um campo renomeado
 * passaria pelo `tsc` e quebraria em runtime. Este arquivo fecha a lacuna.
 *
 * Roda no `verify` e **não** em runtime, por decisão registrada em `0005`: o
 * dado é estático e só muda por commit, então validar 1.120 objetos a cada cold
 * start pagaria custo eterno por um risco que existe no momento do commit.
 *
 * Está em teste, e não em script próprio, porque o `verify` já executa o Vitest
 * — que resolve TypeScript nativamente e dá diff em vez de log.
 */

const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

describe('snapshot de reserva', () => {
  const data = read('src/data/universe-snapshot.json');

  it('tem a forma que o SnapshotProvider assume', () => {
    const result = universeFileSchema.safeParse(data);
    // A mensagem entra na falha: sem ela, o erro do Zod em mil itens é ilegível.
    expect(result.success, JSON.stringify(result.error?.issues.slice(0, 3), null, 2)).toBe(true);
  });

  it('cobre as duas classes de ativo do produto', () => {
    const parsed = universeFileSchema.parse(data);
    const kinds = new Set(parsed.instruments.map((instrument) => instrument.kind));

    expect(kinds).toEqual(new Set(['stock', 'reit']));
    expect(parsed.instruments.length).toBeGreaterThan(500);
  });

  it('não tem ticker repetido', () => {
    const parsed = universeFileSchema.parse(data);
    const symbols = parsed.instruments.map((instrument) => instrument.symbol);

    expect(new Set(symbols).size).toBe(symbols.length);
  });
});

describe('universo de fixture', () => {
  const data = read('src/fixtures/universe.json');

  it('tem a forma que o FixtureProvider assume', () => {
    const result = universeFileSchema.safeParse(data);
    expect(result.success, JSON.stringify(result.error?.issues.slice(0, 3), null, 2)).toBe(true);
  });

  it('passa de uma página, para a paginação ser exercitada pelo e2e', () => {
    const parsed = universeFileSchema.parse(data);
    expect(parsed.instruments.length).toBeGreaterThan(50);
  });

  it('contém os tickers de que os testes dependem', () => {
    const parsed = universeFileSchema.parse(data);
    const symbols = new Set(parsed.instruments.map((instrument) => instrument.symbol));

    for (const required of ['PETR4', 'HGLG11', 'ADSH11', 'MXRF11', 'KNRI11']) {
      expect(symbols.has(required), `fixture sem ${required}`).toBe(true);
    }
  });
});

describe('séries de fixture', () => {
  const data = read('src/fixtures/series.json');

  it('tem a forma que o FixtureProvider assume', () => {
    const result = seriesFileSchema.safeParse(data);
    expect(result.success, JSON.stringify(result.error?.issues.slice(0, 3), null, 2)).toBe(true);
  });

  it('a chave declara o mesmo ticker e período do conteúdo', () => {
    const parsed = seriesFileSchema.parse(data);

    for (const [key, series] of Object.entries(parsed.series)) {
      expect(key).toBe(`${series.symbol}:${series.range}`);
    }
  });

  it('os candles estão em ordem cronológica', () => {
    const parsed = seriesFileSchema.parse(data);

    for (const [key, series] of Object.entries(parsed.series)) {
      const dates = series.candles.map((candle) => candle.date);
      expect(dates, `${key} fora de ordem`).toEqual([...dates].sort());
    }
  });

  it('máxima nunca é menor que mínima', () => {
    const parsed = seriesFileSchema.parse(data);

    for (const [key, series] of Object.entries(parsed.series)) {
      for (const candle of series.candles) {
        expect(candle.high, `${key} em ${candle.date}`).toBeGreaterThanOrEqual(candle.low);
      }
    }
  });
});
