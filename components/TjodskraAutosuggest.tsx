// ✅ TjodskraAutosuggest.tsx — debounced, robust, avoids stack errors, guards response

'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { authService } from '@/lib/authService';

interface Result {
  nafn: string;
  kennitala: string;
}

interface Props {
  onSelect: (entry: Result) => void;
  value?: string;
  className?: string;
}

export default function TjodskraAutosuggest({ onSelect, value = '', className = '' }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Result[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (debounceTimer) clearTimeout(debounceTimer);

    const timer = setTimeout(async () => {
      const token = await authService.getToken();
      const isKennitala = /^\d+$/.test(query);
      const minLength = isKennitala ? 4 : 3;

      if (query.length < minLength) return;

      const endpoint = isKennitala
        ? `/signet/transfer/getTjodskraByKennitala?kennitala=${query}&max=8`
        : `/signet/transfer/getTjodskraByName?nafn=${encodeURIComponent(query)}&max=8`;

      try {
        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_BASE}${endpoint}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();

        if (!Array.isArray(data)) {
          console.warn('Autosuggest: Unexpected response structure', data);
          setResults([]);
          setShowResults(false);
          return;
        }

        setResults(data);
        setShowResults(true);
      } catch (error) {
        console.error('Autosuggest fetch failed:', error);
        setResults([]);
        setShowResults(false);
      }
    }, 400);

    setDebounceTimer(timer);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        className="border px-2 py-1 rounded w-full"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 3 && setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 150)}
        placeholder="Nafn eða kennitala"
      />
      {showResults && results.length > 0 && (
        <ul className="absolute z-10 bg-white border w-full mt-1 rounded shadow text-sm">
          {results.map((r, i) => (
            <li
              key={i}
              className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                onSelect(r);
                setQuery(`${r.nafn} (${r.kennitala})`);
                setShowResults(false);
              }}
            >
              {r.nafn} ({r.kennitala})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
