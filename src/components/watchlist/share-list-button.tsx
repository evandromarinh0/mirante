'use client';

import { useState } from 'react';
import { WATCHLIST_QUERY_KEY } from '@/lib/constants';

/**
 * Compartilhar a lista por link.
 *
 * Sem Web Share API e sem depender de `navigator.clipboard`: os dois falham em
 * contexto não seguro e em parte dos navegadores. O caminho garantido é mostrar
 * o link em um campo somente-leitura já selecionado — copiar continua sendo um
 * atalho, mas não é o único caminho.
 */
export function ShareListButton({ symbols }: { readonly symbols: readonly string[] }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  if (symbols.length === 0) return null;

  const url = `${typeof window === 'undefined' ? '' : window.location.origin}/lista?${WATCHLIST_QUERY_KEY}=${symbols.join(',')}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Sem permissão de área de transferência: o campo abaixo resolve.
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-expanded={visible}
        className="border-border-strong text-text hover:bg-bg-subtle inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
      >
        Compartilhar lista
      </button>

      {visible && (
        <div className="flex items-center gap-2">
          <label htmlFor="share-url" className="sr-only">
            Link da lista
          </label>
          <input
            id="share-url"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="border-border bg-surface text-text-secondary h-9 w-64 rounded-md border px-2 font-mono text-xs"
          />
          <button
            type="button"
            onClick={copy}
            className="border-border-strong text-text hover:bg-bg-subtle inline-flex h-9 items-center rounded-md border px-3 text-sm"
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}
    </div>
  );
}
