import type { MetadataRoute } from 'next';
import snapshot from '@/data/universe-snapshot.json';
import { site } from '@/lib/site';
import type { Instrument } from '@/lib/market/types';

/**
 * Gerado do snapshot versionado, não da API: não faz sentido consultar a fonte
 * para montar sitemap, e o conjunto de tickers muda devagar.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const instruments = snapshot.instruments as readonly Instrument[];

  return [
    { url: site.url, changeFrequency: 'hourly', priority: 1 },
    { url: `${site.url}/lista`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${site.url}/sobre`, changeFrequency: 'monthly', priority: 0.3 },
    ...instruments.map((instrument) => ({
      url: `${site.url}/ativo/${instrument.symbol}`,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ];
}
