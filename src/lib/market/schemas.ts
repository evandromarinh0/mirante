import { z } from 'zod';
import { HISTORY_RANGES } from './types';

/**
 * Schemas do **domínio** — não da fonte.
 *
 * Os schemas em `providers/brapi/schemas.ts` descrevem a resposta de terceiro;
 * estes descrevem o que o produto considera um ativo, um candle e uma série.
 * São a contraparte que faltava: a resposta da API passava por Zod, mas o dado
 * versionado no próprio repositório entrava por asserção de tipo.
 *
 * Onde eles rodam é decisão registrada em `docs/decisions/0005`: no portão do
 * `verify`, não em runtime. O dado é estático e só muda por commit, então
 * validar 1.120 objetos a cada cold start pagaria custo eterno por um risco que
 * existe apenas no momento do commit.
 */

/**
 * Formato de ticker **derivado do dado real**, não de suposição — e é mais largo
 * do que o produto assume hoje. Medido nos 1.120 ativos do snapshot:
 *
 * - raiz de quatro caracteres que pode conter dígito: `B3SA3`, `B1003`;
 * - zero a dois dígitos de classe: `PETR4`, `ABCB10`, `BRAX`;
 * - sufixo `F` (mercado fracionário) ou `B`, isolados ou combinados — 397
 *   ativos com `F`, 3 com `B`, 4 com `BF`.
 *
 * **O validador do produto (`isValidSymbol`) rejeita 410 destes 1.120**, entre
 * eles `B3SA3`. Este schema descreve o que existe no arquivo; a divergência é
 * defeito conhecido, aberto para decisão. Afrouxar aqui para casar com o
 * validador esconderia o problema em vez de mostrá-lo.
 */
const symbol = z
  .string()
  .regex(/^[A-Z][A-Z0-9]{3}\d{0,2}[BF]{0,2}$/, 'ticker fora do formato observado na B3');

const finite = z.number().finite();

export const instrumentSchema = z.object({
  symbol,
  name: z.string().min(1),
  kind: z.enum(['stock', 'reit']),
  price: finite.positive('ativo sem preço não deveria ter entrado no universo'),
  change: finite,
  changePercent: finite,
  volume: finite.nonnegative(),
  sector: z.string().min(1).nullable(),
});

export const candleSchema = z.object({
  date: z.string().datetime({ message: 'data de candle deve ser ISO 8601 em UTC' }),
  open: finite.nonnegative(),
  high: finite.nonnegative(),
  low: finite.nonnegative(),
  close: finite.nonnegative(),
  volume: finite.nonnegative(),
});

export const seriesSchema = z.object({
  symbol,
  range: z.enum(HISTORY_RANGES),
  candles: z.array(candleSchema).min(1, 'série sem candle não é série'),
});

/** Forma do arquivo de snapshot e do universo de fixture. */
export const universeFileSchema = z.object({
  capturedAt: z.string().datetime(),
  instruments: z.array(instrumentSchema).min(1),
});

/** Forma do arquivo de séries de fixture, indexado por `TICKER:range`. */
export const seriesFileSchema = z.object({
  capturedAt: z.string().datetime(),
  series: z.record(
    z.string().regex(/^[A-Z][A-Z0-9]{3}\d{0,2}[BF]{0,2}:(1d|5d|1mo|3mo)$/),
    seriesSchema,
  ),
});
