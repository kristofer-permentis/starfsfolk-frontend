'use client';

import { cn } from '@/lib/utils';

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export default function FormSelect({ label, options, className, id, ...props }: FormSelectProps) {
  const selectId = id || props.name;

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'block w-full rounded border border-gray-300 px-3 py-2 shadow-sm text-sm focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]',
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
