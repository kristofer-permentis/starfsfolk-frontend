'use client';

import { cn } from '@/lib/utils';

interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold text-[#4A5459] mb-4', className)}>
      {children}
    </h2>
  );
}