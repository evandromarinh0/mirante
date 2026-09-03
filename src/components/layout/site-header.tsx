import Link from 'next/link';
import { BrandMark } from '@/components/ui/brand-mark';
import { Container } from '@/components/ui/container';
import { SiteNav } from './site-nav';

/**
 * Cabeçalho. Fica fixo porque a tabela é longa e o status do mercado precisa
 * continuar visível durante a rolagem — não por moda.
 */
export function SiteHeader() {
  return (
    <header className="border-border bg-bg/90 sticky top-0 z-40 border-b backdrop-blur-sm">
      <Container className="flex h-[var(--header-height)] items-center justify-between gap-4">
        <Link
          href="/"
          className="text-text hit-area inline-flex items-center gap-2 font-medium tracking-tight"
          aria-label="Mirante — início"
        >
          <BrandMark className="text-accent size-6" />
          <span>Mirante</span>
        </Link>

        <SiteNav />
      </Container>
    </header>
  );
}
