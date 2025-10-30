'use client';

import { useEffect, useMemo, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import Card from '@/components/Card';
import PageTitle from '@/components/PageTitle';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
const api_url = `${API_BASE}/api/umbod/umbodlist/`;

// Types
interface Umbodsthegi {
  nafn: string;
  kennitala: string;
}

interface UmbodRecord {
  id: number;
  nafn: string;
  kennitala: string;
  umbodsthegar: Umbodsthegi[];
  gildirfra: string; // ISO
  gildirtil: string; // ISO
  sidastbreytt: string; // ISO
}

// Helpers
const fmtIS = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('is-IS').format(d);
};

const isActive = (rec: UmbodRecord, now = new Date()) => {
  const start = new Date(rec.gildirfra);
  const end = new Date(rec.gildirtil);
  return start <= now && now <= end;
};

const normalise = (s: string) => s.toLocaleLowerCase('is-IS').normalize('NFKD');

export default function UmbodTable() {
  const [records, setRecords] = useState<UmbodRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters / sorting / pagination
  const [filters, setFilters] = useState({
    nafn: '',
    kennitala: '',
    umbods: '', // matches any umboðshafi (nafn eða kennitala)
  });
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof UmbodRecord>('nafn');
  const [sortAsc, setSortAsc] = useState(true);

  // History view state (full-page, no modal)
  const [view, setView] = useState<'list' | 'history'>('list');
  const [selectedKennitala, setSelectedKennitala] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [history, setHistory] = useState<UmbodRecord[] | null>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchWithAuth(api_url, { method: 'GET' });
        if (!res.ok) throw new Error(`Villa í svari (${res.status})`);
        const data: UmbodRecord[] = await res.json();
        if (!cancelled) setRecords(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Tókst ekki að sækja gögn');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Active only (main table shows only active powers of attorney)
  const activeRecords = useMemo(() => records.filter(r => isActive(r)), [records]);

  // Client-side filtering
  const filtered = useMemo(() => {
    const n = normalise(filters.nafn);
    const k = normalise(filters.kennitala);
    const u = normalise(filters.umbods);

    return activeRecords.filter(r => {
      const inNafn = !n || normalise(r.nafn).includes(n);
      const inKt = !k || normalise(r.kennitala).includes(k);
      const inUmbod =
        !u ||
        r.umbodsthegar.some(x =>
          normalise(x.nafn).includes(u) || normalise(x.kennitala).includes(u)
        );
      return inNafn && inKt && inUmbod;
    });
  }, [activeRecords, filters]);

  // Sorting
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const A = (a[sortField] ?? '') as any;
      const B = (b[sortField] ?? '') as any;
      // Special case for dates
      const isDateField = ['gildirfra', 'gildirtil', 'sidastbreytt'].includes(
        sortField as string
      );
      const aval = isDateField ? new Date(String(A)).getTime() : String(A).toLowerCase();
      const bval = isDateField ? new Date(String(B)).getTime() : String(B).toLowerCase();
      if (aval < bval) return sortAsc ? -1 : 1;
      if (aval > bval) return sortAsc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const visible = useMemo(() => {
    const start = (pageClamped - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageClamped, pageSize]);

  const updateFilter = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const toggleSort = (field: keyof UmbodRecord) => {
    if (sortField === field) setSortAsc(s => !s);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Modal open -> fetch history
  const openHistory = async (kennitala: string) => {
    try {
      setSelectedKennitala(kennitala);
      setView('history');
      setHistoryLoading(true);
      setHistoryError(null);
      setHistory(null);
      const url = `${api_url}${kennitala}/`;
      const res = await fetchWithAuth(url, { method: 'GET' });
      if (!res.ok) throw new Error(`Villa í svari (${res.status})`);
      const data: UmbodRecord[] = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setHistoryError(e?.message || 'Tókst ekki að sækja eldri umboð');
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <RequireAuth>
      <PageTitle>Umboð</PageTitle>
      {view==='list' && (<Card>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="flex flex-col">
            <label className="text-sm text-gray-700 mb-1">Nafn</label>
            <input
              type="text"
              value={filters.nafn}
              onChange={e => updateFilter('nafn', e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 shadow-sm"
              placeholder="Leita að nafni…"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-700 mb-1">Kennitala</label>
            <input
              type="text"
              value={filters.kennitala}
              onChange={e => updateFilter('kennitala', e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 shadow-sm"
              placeholder="Leita að kennitölu…"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-700 mb-1">Umboðshafi (nafn/kt)</label>
            <input
              type="text"
              value={filters.umbods}
              onChange={e => updateFilter('umbods', e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 shadow-sm"
              placeholder="Leita í umboðshöfum…"
            />
          </div>
          <div className="flex flex-col justify-end">
            <label className="text-sm text-gray-700 mb-1">Raða eftir</label>
            <select
              className="border border-gray-300 rounded px-2 py-1 shadow-sm"
              value={String(sortField)}
              onChange={e => setSortField(e.target.value as keyof UmbodRecord)}
            >
              <option value="nafn">Nafn</option>
              <option value="kennitala">Kennitala</option>
              <option value="gildirfra">Gildir frá</option>
              <option value="gildirtil">Gildir til</option>
              <option value="sidastbreytt">Síðast breytt</option>
            </select>
          </div>
        </div>

        {/* Status / counts */}
        <div className="flex items-center justify-between mb-2 text-sm text-gray-700">
          <div>
            {loading && 'Hleð…'}
            {error && <span className="text-red-600">{error}</span>}
            {!loading && !error && (
              <span>Virk umboð: {filtered.length.toLocaleString('is-IS')}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>Síða</span>
            <button
              disabled={pageClamped <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-gray-300 text-sm rounded disabled:opacity-50"
            >
              Fyrri
            </button>
            <span>
              {pageClamped} / {totalPages}
            </span>
            <button
              disabled={pageClamped >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-gray-300 text-sm rounded disabled:opacity-50"
            >
              Næsta
            </button>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="ml-2 border border-gray-300 rounded px-2 py-1 shadow-sm"
            >
              {[25, 50, 75, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-left">
                <Th onClick={() => toggleSort('id')} active={sortField==='id'} asc={sortAsc}>ID</Th>
                <Th onClick={() => toggleSort('nafn')} active={sortField==='nafn'} asc={sortAsc}>Nafn</Th>
                <Th onClick={() => toggleSort('kennitala')} active={sortField==='kennitala'} asc={sortAsc}>Kennitala</Th>
                <Th>Umboðshafar</Th>
                <Th onClick={() => toggleSort('gildirfra')} active={sortField==='gildirfra'} asc={sortAsc}>Gildir frá</Th>
                <Th onClick={() => toggleSort('gildirtil')} active={sortField==='gildirtil'} asc={sortAsc}>Gildir til</Th>
                <Th onClick={() => toggleSort('sidastbreytt')} active={sortField==='sidastbreytt'} asc={sortAsc}>Síðast breytt</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr key={r.id} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-3 py-2 align-top">{r.id}</td>
                  <td className="px-3 py-2 align-top">
                    <button
                      onClick={() => openHistory(r.kennitala)}
                      className="text-blue-700 hover:underline"
                      title="Sýna eldri umboð fyrir þetta kennitölu"
                    >
                      {r.nafn}
                    </button>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <button
                      onClick={() => openHistory(r.kennitala)}
                      className="text-blue-700 hover:underline"
                      title="Sýna eldri umboð fyrir þetta kennitölu"
                    >
                      {r.kennitala}
                    </button>
                  </td>
                  <td className="px-3 py-2 align-top whitespace-pre-line">
                    {r.umbodsthegar?.map((u, i) => `${u.nafn} (${u.kennitala})`).join('\n')}
                  </td>
                  <td className="px-3 py-2 align-top">{fmtIS(r.gildirfra)}</td>
                  <td className="px-3 py-2 align-top">{fmtIS(r.gildirtil)}</td>
                  <td className="px-3 py-2 align-top">{fmtIS(r.sidastbreytt)}</td>
                </tr>
              ))}
              {!loading && !error && visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    Engin umboð fundust með þessum skilyrðum.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>)}

      {/* History full-page view */}
      {view==='history' && (
        <Card>
          <div className="flex items-center justify-between px-1 py-2">
            <h2 className="text-lg font-semibold">Eldri umboð — {selectedKennitala}</h2>
            <button
              onClick={() => { setView('list'); setSelectedKennitala(null); setHistory(null); setHistoryError(null); }}
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              Til baka
            </button>
          </div>
          <div className="mt-2">
            {historyLoading && <div>Hleð…</div>}
            {historyError && <div className="text-red-600">{historyError}</div>}
            {!historyLoading && !historyError && (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Nafn</th>
                      <th className="px-3 py-2">Kennitala</th>
                      <th className="px-3 py-2">Umboðshafar</th>
                      <th className="px-3 py-2">Gildir frá</th>
                      <th className="px-3 py-2">Gildir til</th>
                      <th className="px-3 py-2">Síðast breytt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(history ?? []).sort((a,b)=> new Date(b.gildirfra).getTime()-new Date(a.gildirfra).getTime()).map(h => (
                      <tr key={h.id} className="border-t border-gray-200">
                        <td className="px-3 py-2 align-top">{h.id}</td>
                        <td className="px-3 py-2 align-top">{h.nafn}</td>
                        <td className="px-3 py-2 align-top">{h.kennitala}</td>
                        <td className="px-3 py-2 align-top whitespace-pre-line">
                          {h.umbodsthegar?.map(u => `${u.nafn} (${u.kennitala})`).join('\n')}
                        </td>
                        <td className="px-3 py-2 align-top">{fmtIS(h.gildirfra)}</td>
                        <td className="px-3 py-2 align-top">{fmtIS(h.gildirtil)}</td>
                        <td className="px-3 py-2 align-top">{fmtIS(h.sidastbreytt)}</td>
                      </tr>
                    ))}
                    {history && history.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-gray-500">Engin eldri umboð fundust.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}
    </RequireAuth>
  );
}

// Small header cell with sort chevron
function Th({ children, onClick, active, asc }: { children: React.ReactNode; onClick?: () => void; active?: boolean; asc?: boolean; }) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2 select-none cursor-pointer ${active ? 'text-blue-800' : ''}`}
      title={onClick ? 'Raða' : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && (
          <span aria-hidden>{asc ? '▲' : '▼'}</span>
        )}
      </span>
    </th>
  );
}
