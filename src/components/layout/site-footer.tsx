import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { site } from '@/lib/site';

/**
 * O aviso de não-afiliação é obrigatório em toda página e coberto por teste.
 *
 * A ambiguidade precisa morrer no primeiro contato: o produto olha o mesmo
 * mercado em que o autor trabalhou, e ninguém pode confundir projeto pessoal
 * com produto de empregador.
 */
export function SiteFooter() {
  return (
    <footer className="border-border mt-[var(--space-section)] border-t py-8">
      <Container className="flex flex-col gap-4">
        <p data-testid="disclaimer" className="text-text-muted max-w-[70ch] text-xs">
          {site.disclaimer}
        </p>

        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <li>
            <Link
              href="/sobre"
              className="text-text-secondary hover:text-text hit-area inline-flex items-center text-xs"
            >
              Sobre o Mirante e a origem dos dados
            </Link>
          </li>
          <li>
            <a
              href="https://brapi.dev"
              rel="noreferrer noopener external"
              target="_blank"
              className="text-text-secondary hover:text-text hit-area inline-flex items-center text-xs"
            >
              Fonte dos dados
            </a>
          </li>
        </ul>
      </Container>
    </footer>
  );
}
