'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PARAM, tableHref, type TableState } from '@/lib/market/table-state';

/**
 * Busca que filtra enquanto se digita — como melhoria progressiva, não como
 * substituto.
 *
 * O `<form method="get">` continua sendo o mecanismo: sem JavaScript, digitar e
 * enviar funciona igual. Com JavaScript, cada pausa na digitação vira uma
 * navegação `replace` dentro de `startTransition`.
 *
 * **A filtragem não acontece no cliente**, e isso é decisão registrada em
 * docs/decisions/0003: o universo tem mais de mil ativos e o cliente enxerga
 * uma página de cinquenta. Filtrar o que está na tela mostraria "3 resultados"
 * quando existem trinta, o que é pior do que ser um pouco mais lento.
 *
 * O que a transição garante: **a tabela anterior fica na tela** enquanto a nova
 * chega, com um indicador discreto. Conteúdo que pisca para vazio e volta é o
 * erro mais comum em dashboard, e a regra do projeto é nunca voltar ao
 * esqueleto em revalidação.
 */

const DEBOUNCE_MS = 250;

export function SearchField({
  state,
  basePath,
  keepParams = {},
}: {
  readonly state: TableState;
  readonly basePath: string;
  readonly keepParams?: Readonly<Record<string, string>>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(state.query);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * `url` é a última query que vimos na URL; `navigated` é a última que nós
   * mesmos pedimos. Os dois vivem em estado, não em ref, porque são lidos
   * durante o render — ref lido no render não é seguro, e o lint reprova.
   */
  const [sync, setSync] = useState({ url: state.query, navigated: state.query });

  /**
   * A URL manda quando a mudança **não** foi nossa: voltar no histórico ou
   * clicar em "limpar busca" precisa aparecer no campo.
   *
   * Ajuste durante o render, não em efeito — é o padrão que o React recomenda
   * para estado derivado de prop. A comparação com `navigated` fecha uma corrida
   * real: sem ela, a URL da nossa própria navegação voltaria e sobrescreveria as
   * teclas digitadas nos 250 ms seguintes.
   */
  if (sync.url !== state.query) {
    const external = state.query !== sync.navigated;
    setSync({ url: state.query, navigated: sync.navigated });
    if (external) setValue(state.query);
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function navigate(query: string) {
    // Buscar sempre volta para a primeira página: continuar na página 7 de um
    // resultado que encolheu não significa nada.
    const trimmed = query.trim();
    setSync((current) => ({ ...current, navigated: trimmed }));
    const href = tableHref({ ...state, query: trimmed, page: 1 }, basePath, keepParams);
    startTransition(() => router.replace(href, { scroll: false }));
  }

  function schedule(query: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate(query), DEBOUNCE_MS);
  }

  return (
    <form
      action={basePath}
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        navigate(value);
      }}
      className="flex min-w-0 items-center gap-2"
    >
      <label htmlFor="market-search" className="sr-only">
        Buscar por código ou nome
      </label>
      <input
        id="market-search"
        type="search"
        name={PARAM.query}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          schedule(event.target.value);
        }}
        placeholder="PETR4, banco, logística…"
        maxLength={32}
        autoComplete="off"
        className="border-border-strong bg-surface text-text placeholder:text-text-muted h-9 min-w-0 flex-1 rounded-md border px-3 text-sm sm:w-64 sm:flex-none"
      />

      {/* O filtro de classe viaja junto, senão buscar zeraria o filtro. */}
      {state.kind !== 'all' && (
        <input type="hidden" name={PARAM.kind} value={state.kind === 'stock' ? 'acoes' : 'fiis'} />
      )}
      {Object.entries(keepParams).map(([key, keptValue]) => (
        <input key={key} type="hidden" name={key} value={keptValue} />
      ))}

      {/* Sem JavaScript este botão é o que envia o formulário. Com JavaScript
          ele continua válido para quem prefere confirmar. */}
      <button
        type="submit"
        className="border-border-strong text-text hover:bg-bg-subtle h-9 shrink-0 rounded-md border px-3 text-sm font-medium"
      >
        Buscar
      </button>

      <span
        aria-live="polite"
        className={`text-text-muted shrink-0 text-xs transition-opacity duration-[var(--duration-fast)] ${
          pending ? 'opacity-100' : 'opacity-0'
        }`}
      >
        atualizando
      </span>
    </form>
  );
}
