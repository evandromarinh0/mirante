import { MAIN_CONTENT_ID } from '@/lib/constants';

/** Visível apenas ao receber foco pelo teclado — primeiro item da tabulação. */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="bg-surface text-text border-border sr-only rounded-md border px-4 py-2 text-sm font-medium focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:left-3 focus-visible:z-50"
    >
      Ir para o conteúdo
    </a>
  );
}
