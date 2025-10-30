'use client';

import { cn } from '@/lib/utils';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export default function FormTextarea({ label, className, id, ...props }: FormTextareaProps) {
  const textareaId = id || props.name;

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'block w-full rounded border border-gray-300 px-3 py-2 shadow-sm text-sm resize-none focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]',
          className
        )}
        rows={4}
        {...props}
      />
    </div>
  );
}