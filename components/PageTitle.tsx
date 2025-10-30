'use client';

import { cn } from '@/lib/utils';

interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageTitle({ children, className }: PageTitleProps) {
  return (
    <h1 className={cn('text-2xl font-bold text-[#4A5459] mb-6', className)}>
      {children}
    </h1>
  );
}