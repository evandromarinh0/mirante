'use client';

import './globals.css';

/**
 * Fronteira de último recurso: cobre falha no próprio layout raiz, quando o
 * cabeçalho e o rodapé não existem para servir de moldura.
 *
 * Por isso ela renderiza `<html>` e `<body>` por conta própria, e por isso o
 * estilo é mínimo e escrito em token — nesta situação não há garantia de que
 * qualquer outra parte da árvore montou.
 *
 * O aviso de não-afiliação aparece aqui também. Ele é obrigatório em toda
 * página, e "toda" inclui a que quebrou.
 */
export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-bg text-text flex min-h-dvh flex-col items-start gap-4 p-8 font-sans">
        <p className="text-text-muted font-mono text-xs tracking-wide">FALHA GERAL</p>
        <h1 className="text-2xl font-medium">O Mirante não conseguiu carregar</h1>
        <p className="text-text-secondary max-w-[60ch] text-sm">
          A falha aconteceu antes de a página existir, então não há muito o que mostrar. Recarregar
          costuma resolver.
        </p>

        <button
          type="button"
          onClick={reset}
          className="border-border-strong text-text hover:bg-bg-subtle hit-area inline-flex items-center rounded-md border px-4 text-sm font-medium"
        >
          Recarregar
        </button>

        {error.digest && (
          <p className="text-text-muted font-mono text-xs">Referência: {error.digest}</p>
        )}

        <p data-testid="disclaimer" className="text-text-muted mt-auto max-w-[70ch] text-xs">
          Projeto pessoal independente, sem vínculo com qualquer empresa. Dados de API pública, com
          atraso. Nada aqui é recomendação de investimento.
        </p>
      </body>
    </html>
  );
}
