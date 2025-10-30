'use client';

import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'pmgray';
}

export default function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-colors duration-200';

  const variants = {
    primary: 'bg-[#4A5459] text-white hover:bg-[#2e3538] focus:ring-2 focus:ring-[#4A5459]',
    secondary: 'bg-[#EFF3F5] text-[#4A5459] hover:bg-[#d6dfe3] border border-[#C2C9C7] focus:ring-2 focus:ring-[#4A5459]',
    danger: 'bg-red-100 text-red-800 hover:bg-red-200 focus:ring-2 focus:ring-red-300',
    pmgray: 'bg-[#4A5459] text-white hover:bg-[#C2C9C7] focus:ring-2 focus:ring-[#4A5459]',
  };

  return (
    <button
      {...props}
      className={cn(base, variants[variant], className)}
    />
  );
}
