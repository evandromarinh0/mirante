import { describe, expect, it } from 'vitest';
import { buildChartGeometry, niceStep, niceTicks } from '@/lib/chart/geometry';
import type { Candle } from '@/lib/market/types';

/**
 * Geometria é aritmética, e aritmética errada em gráfico de preço não avisa:
 * a linha simplesmente mente. Por isso a escala é testada, e não conferida
 * olhando a tela.
 */

const candle = (date: string, close: number): Candle => ({
  date,
  open: close,
  high: close,
  low: close,
  close,
  volume: 100,
});

const series: readonly Candle[] = [
  candle('2026-06-01T00:00:00.000Z', 10),
  candle('2026-06-02T00:00:00.000Z', 20),
  candle('2026-06-03T00:00:00.000Z', 15),
];

describe('niceStep', () => {
  it('arredonda para a base 1-2-5 com os limiares de Heckbert', () => {
    // 0,5 é tão redondo quanto 1: é 5×10⁻¹, da mesma família 1-2-5.
    expect(niceStep(0.7)).toBe(0.5);
    expect(niceStep(1.4)).toBe(1);
    expect(niceStep(2.25)).toBe(2);
    expect(niceStep(3)).toBe(5);
    expect(niceStep(7)).toBe(10);
    expect(niceStep(37.4)).toBe(50);
  });

  it('não devolve zero nem negativo', () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(-5)).toBe(1);
  });
});

describe('niceTicks', () => {
  it('produz marcas redondas dentro do domínio', () => {
    expect(niceTicks(10, 20, 4)).toEqual([10, 12, 14, 16, 18, 20]);
    expect(niceTicks(147.2, 152.8, 4)).toEqual([148, 149, 150, 151, 152]);
  });

  it('não acumula erro de ponto flutuante', () => {
    for (const tick of niceTicks(0.1, 0.5, 4)) {
      expect(String(tick)).not.toMatch(/0000000|9999999/);
    }
  });

  it('lida com domínio degenerado', () => {
    expect(niceTicks(5, 5)).toEqual([5]);
    expect(niceTicks(Number.NaN, 10)).toEqual([]);
  });
});

describe('buildChartGeometry', () => {
  it('devolve nulo para série vazia em vez de um SVG inválido', () => {
    expect(buildChartGeometry([], '3mo')).toBeNull();
  });

  it('mapeia o primeiro e o último ponto nas bordas da área de plotagem', () => {
    const geometry = buildChartGeometry(series, '3mo', 640, 220)!;
    expect(geometry.points[0]!.x).toBe(geometry.padding.left);
    expect(geometry.points[2]!.x).toBe(640 - geometry.padding.right);
  });

  it('inverte o eixo Y: preço maior fica mais alto na tela', () => {
    const geometry = buildChartGeometry(series, '3mo')!;
    const [low, high] = [geometry.points[0]!, geometry.points[1]!];
    expect(high.candle.close).toBeGreaterThan(low.candle.close);
    expect(high.y).toBeLessThan(low.y);
  });

  it('não força o eixo a começar em zero, e declara isso', () => {
    const geometry = buildChartGeometry(series, '3mo')!;
    expect(geometry.min).toBeGreaterThan(0);
    expect(geometry.zeroExcluded).toBe(true);
  });

  it('dá folga para máxima e mínima não tocarem a borda', () => {
    const geometry = buildChartGeometry(series, '3mo')!;
    expect(geometry.min).toBeLessThan(10);
    expect(geometry.max).toBeGreaterThan(20);
  });

  it('fecha a área na linha de base, para o preenchimento não vazar', () => {
    const geometry = buildChartGeometry(series, '3mo')!;
    expect(geometry.areaPath.startsWith('M')).toBe(true);
    expect(geometry.areaPath.endsWith('Z')).toBe(true);
  });

  it('centraliza a série de um único ponto em vez de dividir por zero', () => {
    const geometry = buildChartGeometry([candle('2026-06-01T00:00:00.000Z', 7)], '1mo', 640)!;
    expect(Number.isFinite(geometry.points[0]!.x)).toBe(true);
    expect(geometry.points[0]!.x).toBeGreaterThan(geometry.padding.left);
  });

  it('nunca passa de seis linhas de grade, em qualquer faixa de preço', () => {
    for (const [low, high] of [
      [9.4, 9.6],
      [37.5, 48.1],
      [147, 153],
      [0.42, 0.87],
      [1200, 1890],
    ]) {
      const geometry = buildChartGeometry(
        [candle('2026-06-01T00:00:00.000Z', low!), candle('2026-06-02T00:00:00.000Z', high!)],
        '3mo',
      )!;
      expect(geometry.yTicks.length).toBeLessThanOrEqual(6);
      expect(geometry.yTicks.length).toBeGreaterThan(0);
    }
  });

  it('rotula o eixo X com hora no intradiário e com data no resto', () => {
    expect(buildChartGeometry(series, '1d')!.xTicks[0]!.label).toMatch(/^\d{2}:\d{2}$/);
    expect(buildChartGeometry(series, '3mo')!.xTicks[0]!.label).toMatch(/^\d{2}\/\d{2}$/);
  });
});
