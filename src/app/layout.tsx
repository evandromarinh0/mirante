import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/ui/skip-link';
import { WatchlistProvider } from '@/components/watchlist/watchlist-provider';
import { MAIN_CONTENT_ID } from '@/lib/constants';
import { site } from '@/lib/site';
import './globals.css';

// Self-hosted pelo next/font: zero request externo, o que mantém a CSP
// restritiva possível, e métricas de fallback ajustadas, o que mantém o CLS ~0.
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline}`, template: `%s — ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    type: 'website',
    locale: site.locale,
    siteName: site.name,
    url: site.url,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  // Enquanto não há domínio, indexar a URL provisória só criaria concorrência
  // com o domínio definitivo. Ver o registro 0009 do portfólio.
  robots: site.indexable
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  themeColor: '#fbf9f5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SkipLink />
        {/* Uma instância de estado da lista para a árvore inteira. */}
        <WatchlistProvider>
          <SiteHeader />
          <main id={MAIN_CONTENT_ID} className="flex-1 py-6">
            {children}
          </main>
          <SiteFooter />
        </WatchlistProvider>
      </body>
    </html>
  );
}
