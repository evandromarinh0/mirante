/**
 * O símbolo: um traço de horizonte com a plataforma elevada em voadiço à
 * direita — a silhueta de um mirante reduzida ao mínimo. Traço de 1.5px,
 * `currentColor`, sem preenchimento e sem caixa colorida.
 */
export function BrandMark({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* horizonte */}
      <path d="M1.5 16.5h21" />
      {/* plataforma e sustentação */}
      <path d="M9 16.5v-4.25h9.5" />
      <path d="M12.25 12.25V9.5" />
      <path d="M15.5 12.25V10.75" />
    </svg>
  );
}
