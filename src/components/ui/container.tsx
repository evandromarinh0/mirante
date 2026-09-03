import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ContainerProps {
  readonly as?: ElementType;
  readonly width?: 'default' | 'prose';
  readonly className?: string;
  readonly children: ReactNode;
}

export function Container({
  as: Tag = 'div',
  width = 'default',
  className,
  children,
}: ContainerProps) {
  return (
    <Tag
      className={cn(
        'mx-auto w-full px-[var(--gutter)]',
        width === 'prose' ? 'max-w-[var(--width-prose)]' : 'max-w-[var(--width-container)]',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
