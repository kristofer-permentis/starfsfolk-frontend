interface TabProps {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export default function Tabs({ tabs, active, onChange, className = '' }: TabProps) {
  return (
    <div className={`flex space-x-6 border-b border-gray-300 mb-4 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors duration-150 ease-in-out
            ${active === tab.key
              ? 'border-[--pm-blue] text-[--pm-blue]'
              : 'border-transparent text-gray-500 hover:text-[--pm-blue] hover:border-[--pm-blue]'}
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
