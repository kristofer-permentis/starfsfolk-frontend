'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white shadow-sm border border-gray-200 rounded-lg p-6',
        className
      )}
    >
      {children}
    </div>
  );
}
