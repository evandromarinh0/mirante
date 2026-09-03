import Link from 'next/link';
import { Container } from '@/components/ui/container';

/**
 * 404 desenhado, com caminho de volta. É o estado de "ticker que não existe",
 * e é onde mais se chega por URL digitada à mão.
 */
export default function NotFound() {
  return (
    <Container width="prose" className="flex flex-col gap-4 py-[var(--space-section)]">
      <p className="text-text-muted font-mono text-xs tracking-wide">404</p>
      <h1 className="text-2xl">Não encontramos esta página</h1>
      <p className="text-text-secondary text-sm">
        Se você procurava um ativo, confira o código: os da B3 têm quatro letras e um ou dois
        números, como PETR4 ou HGLG11. O Mirante cobre ações e fundos imobiliários — BDRs, ETFs e
        renda fixa ficam fora.
      </p>
      <p>
        <Link
          href="/"
          className="text-accent hover:text-accent-hover hit-area inline-flex items-center text-sm font-medium underline decoration-1 underline-offset-2"
        >
          Buscar no mercado
        </Link>
      </p>
    </Container>
  );
}
