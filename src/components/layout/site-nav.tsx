'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/**
 * Único componente de cliente do shell, e existe por acessibilidade: marcar a
 * página atual com `aria-current` exige conhecer a rota, e a rota só está
 * disponível no cliente.
 *
 * Três itens cabem em 320px sem menu sanduíche. Menu escondido para três links
 * é complexidade sem ganho — e um toque a mais para chegar a qualquer lugar.
 */

const NAV = [
  { href: '/', label: 'Mercado' },
  { href: '/lista', label: 'Minha lista' },
  { href: '/sobre', label: 'Sobre' },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal">
      <ul className="flex items-center gap-1 sm:gap-2">
        {NAV.map((item) => {
          const current = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'hit-area inline-flex items-center rounded-md px-2 text-sm transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] sm:px-3',
                  current
                    ? 'text-text bg-accent-subtle font-medium'
                    : 'text-text-secondary hover:text-text',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
