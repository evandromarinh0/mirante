import { z } from 'zod';

/**
 * A resposta da Brapi é entrada não confiável e passa por schema antes de virar
 * tipo de domínio. Isso transforma mudança de contrato em erro claro na
 * fronteira, em vez de `undefined` na tela três camadas acima.
 *
 * Os campos opcionais não são frouxidão: são o que a API de fato omite em parte
 * dos ativos — fundo sem setor, ativo sem valor de mercado.
 */

export const brapiListItemSchema = z.object({
  stock: z.string().min(1),
  name: z.string().nullish(),
  close: z.number().nullish(),
  /** Variação do dia em percentual — a listagem não devolve o valor absoluto. */
  change: z.number().nullish(),
  volume: z.number().nullish(),
  market_cap: z.number().nullish(),
  sector: z.string().nullish(),
  type: z.string().nullish(),
  subType: z.string().nullish(),
});

export const brapiListResponseSchema = z.object({
  stocks: z.array(brapiListItemSchema),
  totalCount: z.number().optional(),
  hasNextPage: z.boolean().optional(),
  currentPage: z.number().optional(),
});

export const brapiCandleSchema = z.object({
  /** Epoch em segundos. */
  date: z.number(),
  open: z.number().nullish(),
  high: z.number().nullish(),
  low: z.number().nullish(),
  close: z.number().nullish(),
  volume: z.number().nullish(),
});

export const brapiQuoteResponseSchema = z.object({
  results: z
    .array(
      z.object({
        symbol: z.string(),
        historicalDataPrice: z.array(brapiCandleSchema).nullish(),
      }),
    )
    .min(1),
});

/** Corpo de erro da Brapi. O `code` é o que mapeia para `FailureReason`. */
export const brapiErrorSchema = z.object({
  error: z.literal(true),
  message: z.string().optional(),
  code: z.string().optional(),
});

export type BrapiListItem = z.infer<typeof brapiListItemSchema>;
export type BrapiCandle = z.infer<typeof brapiCandleSchema>;
