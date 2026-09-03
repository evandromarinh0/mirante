import { brapiErrorSchema } from './schemas';

/**
 * Transporte. O token vive só aqui, e só no servidor.
 *
 * Nada neste arquivo pode ser importado por componente de cliente: não há
 * route handler de proxy e o navegador nunca fala com a Brapi. É isso que faz
 * a cota depender da frequência de revalidação, e não do número de visitantes.
 */

const BASE_URL = 'https://brapi.dev/api';

/** Piso de cota para o fallback ser preventivo em vez de reativo. */
export const QUOTA_FLOOR = 500;

export interface BrapiResponse {
  readonly status: number;
  readonly body: unknown;
  readonly quotaRemaining: number | undefined;
  readonly errorCode: string | undefined;
}

export function readToken(): string | undefined {
  const token = process.env.BRAPI_TOKEN?.trim();
  return token ? token : undefined;
}

interface RequestOptions {
  /** Segundos até a próxima revalidação. Ver market-service. */
  readonly revalidate: number;
  readonly tags: readonly string[];
}

export async function brapiRequest(
  path: string,
  { revalidate, tags }: RequestOptions,
): Promise<BrapiResponse> {
  const token = readToken();
  if (!token) {
    throw new Error('BRAPI_TOKEN ausente. O provider brapi não deve ser selecionado sem token.');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    next: { revalidate, tags: [...tags] },
  });

  const raw = await response.text();
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }

  const parsedError = brapiErrorSchema.safeParse(body);
  const remaining = response.headers.get('x-ratelimit-remaining');

  return {
    status: response.status,
    body,
    quotaRemaining: remaining === null ? undefined : Number(remaining),
    errorCode: parsedError.success ? parsedError.data.code : undefined,
  };
}
