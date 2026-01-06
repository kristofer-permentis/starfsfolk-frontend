'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Card from '@/components/Card';
import { authService } from '@/lib/authService';
import TjodskraAutosuggest from '@/components/TjodskraAutosuggest';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/* --------------------------------------------------------------------------
   Types for finance data
   -------------------------------------------------------------------------- */

interface Invoice {
  id: number;
  reference: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  due_date: string | null;
  paid_at: string | null;
}

interface Transaction {
  id: number;
  invoice_id: number | null;
  description: string;
  amount: number;
  type: string;
  created_at: string;
  reference: string | null;
}

interface FinanceData {
  invoices: Invoice[];
  transactions: Transaction[];
  balance: number;
  client_name: string;
  client_kennitala: string;
}

/* --------------------------------------------------------------------------
   Utility functions
   -------------------------------------------------------------------------- */

const formatDate = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('is-IS');
};

const formatDateTime = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('is-IS');
};

const formatAmount = (n?: number | null) => {
  if (n == null) return '—';
  return `${Math.round(n).toLocaleString('is-IS')} kr.`;
};

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'paid':
    case 'greitt':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Greitt</span>;
    case 'pending':
    case 'ógreitt':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Ógreitt</span>;
    case 'overdue':
    case 'gjaldfallið':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Gjaldfallið</span>;
    case 'cancelled':
    case 'afturkallað':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Afturkallað</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{status || '—'}</span>;
  }
};

/* --------------------------------------------------------------------------
   Props interface
   -------------------------------------------------------------------------- */

interface StaffFinanceProps {
  /** Pre-filled kennitala (optional, for modal use) */
  initialKennitala?: string;
  /** Hide the search input (for modal use) */
  hideSearch?: boolean;
  /** Compact mode for modal display */
  compact?: boolean;
}

/* --------------------------------------------------------------------------
   Component
   -------------------------------------------------------------------------- */

export default function StaffFinance({ initialKennitala, hideSearch = false, compact = false }: StaffFinanceProps) {
  const [kennitala, setKennitala] = useState(initialKennitala || '');
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'invoices' | 'transactions'>('invoices');

  const fetchFinanceData = useCallback(async (kt: string) => {
    if (!kt || kt.length < 10) {
      setError('Kennitala verður að vera 10 stafir');
      return;
    }

    // Clean kennitala - remove dashes and spaces
    const cleanKt = kt.replace(/[-\s]/g, '');

    setLoading(true);
    setError('');
    setData(null);

    try {
      const token = await authService.getToken();
      const res = await fetch(`${API_BASE}/api/financestaff/?kennitala=${encodeURIComponent(cleanKt)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Enginn skjólstæðingur fannst með þessa kennitölu');
        }
        if (res.status === 403) {
          throw new Error('Þú hefur ekki heimild til að skoða þessar upplýsingar');
        }
        const text = await res.text().catch(() => '');
        throw new Error(`Villa: ${res.status} ${text || res.statusText}`);
      }

      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Tókst ekki að sækja gögn');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch when initialKennitala is provided
  useEffect(() => {
    if (initialKennitala && initialKennitala.length >= 10) {
      fetchFinanceData(initialKennitala);
    }
  }, [initialKennitala, fetchFinanceData]);

  const handleSearch = () => {
    fetchFinanceData(kennitala);
  };

  const handleSelect = (entry: { nafn: string; kennitala: string }) => {
    setKennitala(entry.kennitala);
    fetchFinanceData(entry.kennitala);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Header */}
      {!hideSearch && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full sm:max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leita að skjólstæðingi
            </label>
            <TjodskraAutosuggest
              onSelect={handleSelect}
              value={kennitala}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Eða sláðu inn kennitölu"
              value={kennitala}
              onChange={(e) => setKennitala(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-48"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !kennitala}
              className="px-4 py-2 bg-[--pm-blue] text-white rounded text-sm hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Hleð...' : 'Leita'}
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8 text-gray-500">
          Hleð gögnum...
        </div>
      )}

      {/* Data display */}
      {data && !loading && (
        <>
          {/* Client info header */}
          <Card className={compact ? 'p-4' : ''}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{data.client_name}</h3>
                <p className="text-sm text-gray-600 font-mono">{data.client_kennitala}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Staða</div>
                <div className={`text-xl font-bold ${data.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatAmount(data.balance)}
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex space-x-4 border-b border-gray-300">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'invoices'
                  ? 'border-[--pm-blue] text-[--pm-blue]'
                  : 'border-transparent text-gray-500 hover:text-[--pm-blue]'
              }`}
            >
              Reikningar ({data.invoices?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'transactions'
                  ? 'border-[--pm-blue] text-[--pm-blue]'
                  : 'border-transparent text-gray-500 hover:text-[--pm-blue]'
              }`}
            >
              Færslur ({data.transactions?.length || 0})
            </button>
          </div>

          {/* Invoices table */}
          {activeTab === 'invoices' && (
            <Card className={compact ? 'p-3' : ''}>
              {(!data.invoices || data.invoices.length === 0) ? (
                <p className="text-gray-500 text-center py-4">Engir reikningar fundust</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Tilvísun</th>
                        <th className="px-3 py-2 text-left">Lýsing</th>
                        <th className="px-3 py-2 text-right">Upphæð</th>
                        <th className="px-3 py-2 text-left">Staða</th>
                        <th className="px-3 py-2 text-left">Stofnað</th>
                        <th className="px-3 py-2 text-left">Gjalddagi</th>
                        <th className="px-3 py-2 text-left">Greitt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-xs">{inv.reference || '—'}</td>
                          <td className="px-3 py-2">{inv.description || '—'}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatAmount(inv.amount)}</td>
                          <td className="px-3 py-2">{getStatusBadge(inv.status)}</td>
                          <td className="px-3 py-2 text-gray-600">{formatDate(inv.created_at)}</td>
                          <td className="px-3 py-2 text-gray-600">{formatDate(inv.due_date)}</td>
                          <td className="px-3 py-2 text-gray-600">{formatDate(inv.paid_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* Transactions table */}
          {activeTab === 'transactions' && (
            <Card className={compact ? 'p-3' : ''}>
              {(!data.transactions || data.transactions.length === 0) ? (
                <p className="text-gray-500 text-center py-4">Engar færslur fundust</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Dagsetning</th>
                        <th className="px-3 py-2 text-left">Lýsing</th>
                        <th className="px-3 py-2 text-left">Tegund</th>
                        <th className="px-3 py-2 text-right">Upphæð</th>
                        <th className="px-3 py-2 text-left">Tilvísun</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600">{formatDateTime(tx.created_at)}</td>
                          <td className="px-3 py-2">{tx.description || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              tx.type === 'payment' || tx.type === 'greiðsla'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.type === 'charge' || tx.type === 'gjaldfærsla'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {tx.type === 'payment' ? 'Greiðsla' : tx.type === 'charge' ? 'Gjaldfærsla' : tx.type}
                            </span>
                          </td>
                          <td className={`px-3 py-2 text-right font-medium ${
                            tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {tx.amount >= 0 ? '+' : ''}{formatAmount(tx.amount)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-gray-600">{tx.reference || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* Empty state when no search performed */}
      {!data && !loading && !error && !hideSearch && (
        <Card>
          <div className="text-center py-8 text-gray-500">
            <p>Sláðu inn kennitölu eða leitaðu að skjólstæðingi til að sjá fjármálaupplýsingar</p>
          </div>
        </Card>
      )}
    </div>
  );
}
