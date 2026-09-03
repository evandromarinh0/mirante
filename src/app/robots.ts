import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

/** Sem domínio, a URL provisória não é indexada. Ver o registro 0009 do portfólio. */
export default function robots(): MetadataRoute.Robots {
  if (!site.indexable) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
