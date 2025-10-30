'use client';

import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import RequireAuth from '@/components/RequireAuth';
import Card from '@/components/Card';
import PageTitle from '@/components/PageTitle';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { authService } from '@/lib/authService';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE

interface FilesTableProps {
  apiPath: string;
  emptyMessage?: string;
}

interface FileRecord {
  id: number;
  file_id: string;
  filename: string;
  creator: string;
  creator_ssn: string;
  group_name: string;
  created: string;
  download_url: string;
  seen: boolean;
  notes?: string;
}

function formatIsoCivilised(iso: string): string {
  const d = new Date(iso);
  let text = d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  return text;
}

const columnLabels: { [key in keyof FileRecord]?: string } = {
  creator: 'Nafn',
  creator_ssn: 'Kennitala',
  group_name: 'Hópur',
  filename: 'Skráarheiti',
  created: 'Dagsetning',
};

export default function FilesTable({ apiPath, emptyMessage }: FilesTableProps) {
  const [error, setError] = useState<Error | null>(null);
  const [records, setRecords] = useState<FileRecord[]>([]);
  const [sortField, setSortField] = useState<keyof FileRecord>('created');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [filters, setFilters] = useState({
    filename: '',
    creator: '',
    creator_ssn: '',
    group_name: '',
    seen: '0'
  });
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const token = await authService.getToken();
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('page_size', pageSize.toString());
      if (filters.filename.length > 2) params.append('filename', filters.filename);
      if (filters.creator.length > 2) params.append('name', filters.creator);
      if (filters.creator_ssn.length > 3) params.append('ssn', filters.creator_ssn);
      if (filters.group_name.length > 2) params.append('group_name', filters.group_name);
      if (filters.seen === '1') params.append('seen', '1');
      if (filters.seen === '0') params.append('seen', '0');
      if (dateRange.from) params.append('date_from', dateRange.from.toISOString());
      if (dateRange.to) params.append('date_to', dateRange.to.toISOString());

      let url = `${API_BASE}${apiPath}?${params.toString()}`
      fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(res => res.json())
        .then(json => {
          if (!Array.isArray(json.results)) {
            throw new Error("Invalid data from backend: results is not an array");
          }
          setRecords(json.results);
          setTotalCount(json.count);
        })
        .catch(err => setError(err));
    }, 500);

    return () => clearTimeout(timeout);
  }, [filters, dateRange, page, pageSize]);

  const updateFilter = (field: keyof typeof filters, value: string) => {
    setFilters({ ...filters, [field]: value });
    setPage(1);
  };

  const toggleSort = (field: keyof FileRecord) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const visibleColumns: (keyof FileRecord)[] = ['creator', 'creator_ssn', 'group_name', 'filename', 'created'];

  const sortedRecords = [...records].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
     if (valA == null && valB == null) return 0;
  if (valA == null) return sortAsc ? 1 : -1;
  if (valB == null) return sortAsc ? -1 : 1;
    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const toggleSeen = async (id: number) => {
    const token = await authService.getToken();
    await fetch(`${API_BASE}/signet/transfer/toggleSeen/${id}/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    setRecords(records => records.map(r => r.id === id ? { ...r, seen: !r.seen } : r));
  };

  const downloadFile = async (url: string) => {
    const token = await authService.getToken();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to download file");
      return;
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'file';
    if (contentDisposition) {
      const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (filenameStarMatch) {
        try {
          filename = decodeURIComponent(filenameStarMatch[1]);
        } catch {
          filename = filenameStarMatch[1];
        }
      } else {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <RequireAuth>
      <div className="max-w-screen-xl mx-auto p-4">
        <PageTitle>Signet transfer</PageTitle>

        <div className="flex gap-4 mb-4">
          <div className="flex flex-col">
            <label className="text-sm text-gray-700 mb-1">Frá</label>
            <DatePicker
              selected={dateRange.from}
              onChange={date => setDateRange(prev => ({ ...prev, from: date }))}
              dateFormat="dd.MM.yyyy"
              className="border border-gray-300 rounded px-2 py-1 shadow-sm"
              placeholderText="dd.mm.yyyy"
              isClearable
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm text-gray-700 mb-1">Til</label>
            <DatePicker
              selected={dateRange.to}
              onChange={date => setDateRange(prev => ({ ...prev, to: date }))}
              dateFormat="dd.MM.yyyy"
              className="border border-gray-300 rounded px-2 py-1 shadow-sm"
              placeholderText="dd.mm.yyyy"
              isClearable
            />
          </div>
          <div className="flex flex-col justify-end">
            <label className="text-sm text-gray-700 mb-1">Fjöldi í síðu</label>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
              className="border border-gray-300 rounded px-2 py-1 shadow-sm"
            >
              {[25, 50, 75, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <label className="text-sm text-gray-700 mb-1">Skoðaðar</label>
            <select
              value={filters.seen}
              onChange={e => updateFilter('seen', e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 shadow-sm"
            >
              <option value="all">Allar</option>
              <option value="1">Skoðaðar</option>
              <option value="0">Óskoðaðar</option>
            </select>
          </div>
        </div>

        <Card>
          <table className="w-full text-sm table-fixed border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                {visibleColumns.map(field => (
                  <th
                    key={field}
                    className="cursor-pointer p-2 border border-gray-300 text-left whitespace-nowrap"
                    onClick={() => toggleSort(field)}
                  >
                    {columnLabels[field] || field} {sortField === field ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                ))}
                <th className="p-2 border border-gray-300">Skoðað</th>
              </tr>
              <tr className="bg-gray-50">
                <td><input className="w-full border p-1" placeholder="Nafn" onChange={e => updateFilter('creator', e.target.value)} /></td>
                <td><input className="w-full border p-1" placeholder="Kennitala" onChange={e => updateFilter('creator_ssn', e.target.value)} /></td>
                <td><input className="w-full border p-1" placeholder="Hópur" onChange={e => updateFilter('group_name', e.target.value)} /></td>
                <td><input className="w-full border p-1" placeholder="Skráarheiti" onChange={e => updateFilter('filename', e.target.value)} /></td>
                <td></td>
                <td></td>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.map((record, index) => (
                <tr
                  key={record.id}
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${record.seen ? 'text-gray-400' : ''}`}
                >
                  <td className="p-2 border border-gray-200 break-words whitespace-normal min-w-[8rem]">{record.creator}</td>
                  <td className="p-2 border border-gray-200 whitespace-nowrap min-w-[8rem]">{record.creator_ssn}</td>
                  <td className="p-2 border border-gray-200 break-words whitespace-normal min-w-[8rem]">{record.group_name}</td>
                  <td className="p-2 border border-gray-200 break-words whitespace-normal min-w-[8rem]">
                    <a
  href="#"
  onClick={async (e) => {
    e.preventDefault();
    const token = await authService.getToken();
    window.open(`${record.download_url}?access_token=${encodeURIComponent(token || '')}`, '_blank');

    // Mark as seen locally (only if not already)
    if (!record.seen) {
      setRecords(prev =>
        prev.map(r =>
          r.id === record.id ? { ...r, seen: true } : r
        )
      );
    }
  }}
  className="text-[--pm-gray-dark] hover:underline"
>
  {record.filename}
</a>
{record.notes && (
  <button
    className="ml-2 text-xs text-blue-600 hover:underline"
    onClick={() => setSelectedNote(record.notes!)}
  >📝</button>
)}

                  </td>
                  <td className="p-2 border border-gray-200 whitespace-nowrap min-w-[8rem]">{formatIsoCivilised(record.created)}</td>
                  <td className="p-2 border border-gray-200 text-center">
                    <input
                      type="checkbox"
                      checked={record.seen}
                      onChange={() => toggleSeen(record.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
{selectedNote && (
  <div className="fixed inset-0 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md border border-gray-300">
      <h2 className="text-lg font-semibold mb-2">Athugasemd</h2>
      <p className="text-sm whitespace-pre-wrap">{selectedNote}</p>
      <div className="text-right mt-4">
        <button
          onClick={() => setSelectedNote(null)}
          className="px-4 py-1 bg-gray-300 rounded"
        >Loka</button>
      </div>
    </div>
  </div>
)}

        <div className="flex justify-between items-center mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-4 py-1 bg-gray-300 text-sm rounded disabled:opacity-50"
          >
            Fyrri síða
          </button>
          <span className="text-sm">
            Síða {page} af {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="px-4 py-1 bg-gray-300 text-sm rounded disabled:opacity-50"
          >
            Næsta síða
          </button>
        </div>
      </div>
    </RequireAuth>
  );
}
