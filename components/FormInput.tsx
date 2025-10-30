'use client';

import { cn } from '@/lib/utils';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function FormInput({ label, className, id, ...props }: FormInputProps) {
  const inputId = id || props.name;

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'block w-full rounded border border-gray-300 px-3 py-2 shadow-sm text-sm focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]',
          className
        )}
        {...props}
      />
    </div>
  );
}
