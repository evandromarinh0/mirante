import type { MarketDataProvider } from '../provider';
import type { ProviderId } from '../result';
import { brapiProvider } from './brapi/brapi-provider';
import { fixtureProvider } from './fixture-provider';
import { snapshotProvider } from './snapshot-provider';

/**
 * Seleção do provider. É o único lugar do projeto que decide de onde vem o dado.
 *
 * O padrão é `fixture` quando não há token: desenvolvimento e preview funcionam
 * sem credencial e sem gastar cota, e um deploy mal configurado degrada para
 * dado de fixture identificado, em vez de estourar em runtime.
 */

const PROVIDERS: Record<ProviderId, MarketDataProvider> = {
  brapi: brapiProvider,
  fixture: fixtureProvider,
  snapshot: snapshotProvider,
};

function isProviderId(value: string | undefined): value is ProviderId {
  return value === 'brapi' || value === 'fixture' || value === 'snapshot';
}

export function resolveProviderId(
  configured: string | undefined = process.env.MARKET_PROVIDER,
  hasToken: boolean = Boolean(process.env.BRAPI_TOKEN?.trim()),
): ProviderId {
  if (isProviderId(configured)) {
    return configured === 'brapi' && !hasToken ? 'fixture' : configured;
  }
  return hasToken ? 'brapi' : 'fixture';
}

export function getProvider(id: ProviderId = resolveProviderId()): MarketDataProvider {
  return PROVIDERS[id];
}

/** Fallback usado quando o provider vivo falha. */
export function getFallbackProvider(): MarketDataProvider {
  return snapshotProvider;
}
