import { describe, expect, it } from 'vitest';
import { brapiProvider } from '@/lib/market/providers/brapi/brapi-provider';
import { instrumentSchema, seriesSchema } from '@/lib/market/schemas';

/**
 * Teste de contrato: bate na **API real** e avisa quando a resposta muda de
 * forma ou de política.
 *
 * Fica fora do CI de propósito, como a spec técnica previa. Ele depende de rede,
 * de credencial e de terceiro: reprovar um pull request por instabilidade da
 * Brapi seria transformar um aviso útil em ruído que se aprende a ignorar. Além
 * disso, cada execução consome cota.
 *
 *   BRAPI_TOKEN=... npm run test:contract
 *
 * Sem token, os casos são pulados em vez de falhar — rodar a suíte inteira sem
 * credencial é o caso normal, não um erro.
 */

const hasToken = Boolean(process.env.BRAPI_TOKEN?.trim());

describe.skipIf(!hasToken)('contrato com a Brapi', () => {
  it('o universo continua vindo com a forma que o domínio espera', async () => {
    const result = await brapiProvider.listUniverse();

    expect(result.ok, 'a listagem do universo falhou').toBe(true);
    if (!result.ok) return;

    // Ordem de grandeza, não número exato: o universo muda todo dia.
    expect(result.data.length).toBeGreaterThan(500);

    const kinds = new Set(result.data.map((instrument) => instrument.kind));
    expect(kinds.has('stock'), 'nenhuma ação no universo').toBe(true);
    expect(kinds.has('reit'), 'nenhum FII no universo').toBe(true);

    // Uma amostra basta: erro de forma se repete em todos os itens.
    for (const instrument of result.data.slice(0, 25)) {
      const parsed = instrumentSchema.safeParse(instrument);
      expect(parsed.success, `${instrument.symbol}: ${parsed.error?.message}`).toBe(true);
    }
  }, 30_000);

  it('a listagem continua sem consumir a cota mensal', async () => {
    // Foi a medição que reorganizou a arquitetura na Etapa 0. Se a Brapi
    // passar a cobrar a listagem, o orçamento inteiro muda — e é melhor
    // descobrir aqui do que pela cota zerada no meio do mês.
    const result = await brapiProvider.listUniverse();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.origin.quotaRemaining).toBeUndefined();
  }, 30_000);

  it('os quatro períodos do plano gratuito continuam respondendo', async () => {
    for (const range of ['1d', '5d', '1mo', '3mo'] as const) {
      const result = await brapiProvider.getHistory('PETR4', range);

      expect(result.ok, `período ${range} deixou de responder`).toBe(true);
      if (!result.ok) continue;
      expect(seriesSchema.safeParse(result.data).success).toBe(true);
    }
  }, 60_000);

  it('a série de um ticker fora do sandbox consome cota e informa o saldo', async () => {
    // O saldo em cabeçalho é o que torna o fallback preventivo possível.
    const result = await brapiProvider.getHistory('HGLG11', '3mo');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.origin.quotaRemaining).toBe('number');
  }, 30_000);

  it('ticker inexistente continua devolvendo não-encontrado, e não erro genérico', async () => {
    const result = await brapiProvider.getHistory('ZZZZ9', '3mo');
    expect(result).toMatchObject({ ok: false, reason: 'not-found' });
  }, 30_000);
});
