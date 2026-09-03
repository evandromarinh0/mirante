'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Container } from '@/components/ui/container';

/**
 * Fronteira de erro do produto.
 *
 * Falha esperada nunca chega aqui: ela é `Result` e vira estado desenhado na
 * própria seção. Esta tela existe para o que não foi previsto — e existe porque
 * o produto promete, em `/sobre` e nos próprios princípios, que ninguém encontra
 * tela de erro. Sem ela, o que aparecia era a tela genérica do framework.
 *
 * O layout continua em volta: cabeçalho, navegação e o aviso de não-afiliação
 * seguem na tela, então a página quebrada ainda é o Mirante.
 */
export default function ProductError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    // Sem serviço de erro de terceiro (a CSP não permitiria um sem revisão), o
    // console é o registro. O `digest` é o que liga esta tela ao log do servidor.
    console.error('Falha não prevista:', error.digest ?? error.message);
  }, [error]);

  return (
    <Container width="prose" className="flex flex-col gap-4 py-[var(--space-section)]">
      <p className="text-text-muted font-mono text-xs tracking-wide">ERRO INESPERADO</p>
      <h1 className="text-2xl">Esta página não carregou</h1>

      <p className="text-text-secondary text-sm">
        Não foi a fonte de dados: quando ela falha, o Mirante mostra o preço de reserva e diz que é
        reserva. Isto aqui é defeito nosso, e não há nada que você possa ter feito de errado.
      </p>
      <p className="text-text-secondary text-sm">
        Tentar de novo costuma resolver, porque a falha pode ter sido momentânea. O resto do produto
        continua funcionando.
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="border-border-strong text-text hover:bg-bg-subtle hit-area inline-flex items-center rounded-md border px-4 text-sm font-medium"
        >
          Tentar de novo
        </button>
        <Link
          href="/"
          className="text-accent hover:text-accent-hover hit-area inline-flex items-center text-sm font-medium underline decoration-1 underline-offset-2"
        >
          Ir para o mercado
        </Link>
      </div>

      {error.digest && (
        <p className="text-text-muted mt-2 font-mono text-xs">
          Referência desta falha: {error.digest}
        </p>
      )}
    </Container>
  );
}
