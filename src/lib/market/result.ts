/**
 * Falha esperada não lança exceção: vira valor. Só bug lança.
 *
 * É a decisão que faz o sistema de estados ser simples em vez de espalhado —
 * cada tela recebe ou dado com procedência, ou um motivo que ela sabe desenhar.
 */

export type FailureReason =
  'unavailable' | 'rate-limited' | 'quota-exhausted' | 'not-found' | 'invalid-symbol';

export type ProviderId = 'brapi' | 'fixture' | 'snapshot';

/** De onde veio o dado que está na tela, e quando. Toda tela mostra isso. */
export interface DataOrigin {
  readonly provider: ProviderId;
  /** ISO 8601. É o instante em que **nós** consultamos, não o do pregão. */
  readonly fetchedAt: string;
  /** Verdadeiro quando o dado não veio da fonte viva. A UI precisa dizer isso. */
  readonly fallback: boolean;
  /** Requisições restantes na cota, quando a fonte informa. */
  readonly quotaRemaining?: number;
}

export type Result<T> =
  | { readonly ok: true; readonly data: T; readonly origin: DataOrigin }
  | { readonly ok: false; readonly reason: FailureReason; readonly detail?: string };

export function ok<T>(data: T, origin: DataOrigin): Result<T> {
  return { ok: true, data, origin };
}

export function fail<T>(reason: FailureReason, detail?: string): Result<T> {
  return detail === undefined ? { ok: false, reason } : { ok: false, reason, detail };
}

export function isOk<T>(result: Result<T>): result is Extract<Result<T>, { ok: true }> {
  return result.ok;
}

/** Mensagens em pt-BR. Ficam aqui porque todo estado de erro as reusa. */
export const FAILURE_MESSAGES: Record<FailureReason, string> = {
  unavailable: 'A fonte de dados não respondeu.',
  'rate-limited': 'A fonte de dados recebeu consultas demais em pouco tempo.',
  'quota-exhausted': 'A cota de consultas do mês foi atingida.',
  'not-found': 'Não encontramos esse ativo.',
  'invalid-symbol': 'Esse código de ativo não é válido.',
};
