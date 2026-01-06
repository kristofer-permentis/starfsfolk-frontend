'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { authService } from '@/lib/authService';
import StaffFinanceModal from './StaffFinanceModal';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

/* --------------------------------------------------------------------------
   Types matching /api/adhdworkup/admin/
   -------------------------------------------------------------------------- */

type FormRow = {
  id: number;
  name: string;
  tally_id: string;
  submission: number | null;
  completed_at: string | null;
};

type WorkupRow = {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  form_expires_at: string;
  is_completed: boolean;
  is_active: boolean;
  tos_signed_at: string | null;
  forms_completed: string | null;
  screening_completed: string | null;
  nurse_completed: string | null;
  psychologist_completed: string | null;
  doctor_completed: string | null;
  screening_result: boolean | null;
  nurse_result: boolean | null;
  psychologist_result: boolean | null;
  doctor_result: boolean | null;
  user_name: string;
  user_kennitala: string;
  screening_reference: string | null;
  screening_item_article: string | null;
  screening_amount: number | null;
  screening_is_paid: boolean | null;
  screening_payment_status: string | null;
  screening_paid_at: string | null;
  screening_authorisation_code: string | null;
  workup_reference: string | null;
  workup_item_article: string | null;
  workup_amount: number | null;
  workup_is_paid: boolean | null;
  workup_payment_status: string | null;
  workup_paid_at: string | null;
  workup_authorisation_code: string | null;
  forms: FormRow[];
};

/* --------------------------------------------------------------------------
   Result update types
   -------------------------------------------------------------------------- */

type ResultField = 'screening_result' | 'nurse_result' | 'psychologist_result' | 'doctor_result';

/* --------------------------------------------------------------------------
   Small utils
   -------------------------------------------------------------------------- */

const fmt = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('is-IS');
};

const kr = (n?: number | null) => (n == null ? '—' : `${Math.round(n).toLocaleString('is-IS')} kr.`);

/* --------------------------------------------------------------------------
   Component
   -------------------------------------------------------------------------- */

export default function ADHDWorkupAdmin() {
  const [rows, setRows] = useState<WorkupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [query, setQuery] = useState('');
  const [updatingResult, setUpdatingResult] = useState<{ id: number; field: ResultField } | null>(null);

  // Finance modal state
  const [financeModal, setFinanceModal] = useState<{ kennitala: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const token = await authService.getToken();
      const res = await fetch(`${API_BASE}/signet/transfer/adhdworkup/admin/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Tókst ekki að sækja gögn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.user_name.toLowerCase().includes(q) ||
      r.user_kennitala.includes(q) ||
      String(r.id).includes(q)
    );
  }, [rows, query]);

  const toggle = (id: number) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const updateResult = async (id: number, field: ResultField, value: boolean | null) => {
    setUpdatingResult({ id, field });
    try {
      const token = await authService.getToken();
      const res = await fetch(`${API_BASE}/signet/transfer/adhdworkup/admin/${id}/`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        throw new Error('Tókst ekki að uppfæra');
      }
      // Update local state
      setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Villa við að uppfæra');
    } finally {
      setUpdatingResult(null);
    }
  };

  const ResultSelect = ({ row, field, label }: { row: WorkupRow; field: ResultField; label: string }) => {
    const value = row[field];
    const isUpdating = updatingResult?.id === row.id && updatingResult?.field === field;

    return (
      <div className="flex items-center justify-between">
        <dt className="text-gray-500">{label}</dt>
        <dd>
          <select
            value={value === null ? '' : value ? 'true' : 'false'}
            onChange={(e) => {
              const newValue = e.target.value === '' ? null : e.target.value === 'true';
              updateResult(row.id, field, newValue);
            }}
            disabled={isUpdating}
            className={`text-sm border rounded px-2 py-1 ${isUpdating ? 'opacity-50' : ''}`}
          >
            <option value="">Ekki skráð</option>
            <option value="true">Jákvætt</option>
            <option value="false">Neikvætt</option>
          </select>
        </dd>
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">ADHD – vinnsluyfirlit</h2>
        <div className="flex items-center gap-2">
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Leita (nafn, kennitala, ID)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            onClick={load}
            disabled={loading}
          >
            Endurhlaða
          </button>
        </div>
      </header>

      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left w-16">ID</th>
              <th className="px-3 py-2 text-left">Skjólstæðingur</th>
              <th className="px-3 py-2 text-left">Kennitala</th>
              <th className="px-3 py-2 text-left">Búið til</th>
              <th className="px-3 py-2 text-left">Staða</th>
              <th className="px-3 py-2 text-left">Skimun</th>
              <th className="px-3 py-2 text-left">Greiðsla</th>
              <th className="px-3 py-2 text-left w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Hleð…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Engar færslur.</td></tr>
            ) : (
              filtered.map((r) => {
                const paid = r.screening_is_paid === true || r.screening_payment_status === 'paid';
                const status = [
                  r.is_active ? 'virk' : 'óvirk',
                  r.is_completed ? 'lokið' : null,
                  r.tos_signed_at ? 'TOS' : null,
                ].filter(Boolean).join(' · ');
                return (
                  <React.Fragment key={r.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggle(r.id)}>
                      <td className="px-3 py-2">{r.id}</td>
                      <td className="px-3 py-2">{r.user_name}</td>
                      <td className="px-3 py-2 font-mono">{r.user_kennitala}</td>
                      <td className="px-3 py-2">{fmt(r.created_at)}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1">
                          <span className={`inline-block h-2 w-2 rounded-full ${r.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          {status || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {r.screening_reference || '—'}
                        {r.screening_amount != null && (
                          <span className="text-gray-500"> · {kr(r.screening_amount)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {paid ? (
                          <span className="text-emerald-700">greitt</span>
                        ) : (
                          <span className="text-amber-700">{r.screening_payment_status || 'ógreitt'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button className="text-xs underline" onClick={(e) => { e.stopPropagation(); toggle(r.id); }}>
                          {expanded[r.id] ? 'Fela' : 'Skoða'}
                        </button>
                      </td>
                    </tr>

                    {expanded[r.id] && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={8} className="px-3 py-3">
                          {/* Finance link button */}
                          <div className="mb-3 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFinanceModal({ kennitala: r.user_kennitala, name: r.user_name });
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[--pm-blue] text-white rounded text-sm hover:opacity-90 transition-opacity"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Skoða fjármál
                            </button>
                          </div>

                          <div className="grid md:grid-cols-3 gap-3 text-sm">
                            <div className="rounded border bg-white p-3">
                              <div className="font-medium mb-2">Upplýsingar</div>
                              <dl className="space-y-1">
                                <div className="flex justify-between"><dt className="text-gray-500">ID</dt><dd>{r.id}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Búið til</dt><dd>{fmt(r.created_at)}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Uppfært</dt><dd>{fmt(r.updated_at)}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Gildir til</dt><dd>{fmt(r.form_expires_at)}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">TOS</dt><dd>{fmt(r.tos_signed_at)}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Lokið</dt><dd>{r.is_completed ? 'já' : 'nei'}</dd></div>
                              </dl>
                            </div>

                            <div className="rounded border bg-white p-3">
                              <div className="font-medium mb-2">Niðurstöður</div>
                              <dl className="space-y-2">
                                <ResultSelect row={r} field="screening_result" label="Skimun" />
                                <ResultSelect row={r} field="nurse_result" label="Hjúkrun" />
                                <ResultSelect row={r} field="psychologist_result" label="Sálfræðingur" />
                                <ResultSelect row={r} field="doctor_result" label="Læknir" />
                              </dl>
                              <div className="mt-3 pt-2 border-t text-xs text-gray-500">
                                <div className="flex justify-between"><span>Skimun lokið:</span><span>{fmt(r.screening_completed)}</span></div>
                                <div className="flex justify-between"><span>Hjúkrun lokið:</span><span>{fmt(r.nurse_completed)}</span></div>
                                <div className="flex justify-between"><span>Sálfræðingur lokið:</span><span>{fmt(r.psychologist_completed)}</span></div>
                                <div className="flex justify-between"><span>Læknir lokið:</span><span>{fmt(r.doctor_completed)}</span></div>
                              </div>
                            </div>

                            <div className="rounded border bg-white p-3">
                              <div className="font-medium mb-2">Greiðslur</div>
                              <div className="space-y-3">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Skimun</div>
                                  <dl className="space-y-1 text-xs">
                                    <div className="flex justify-between"><dt className="text-gray-500">Tilvísun</dt><dd>{r.screening_reference || '—'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-gray-500">Upphæð</dt><dd>{kr(r.screening_amount)}</dd></div>
                                    <div className="flex justify-between"><dt className="text-gray-500">Staða</dt><dd>{r.screening_payment_status || '—'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-gray-500">Greitt</dt><dd>{fmt(r.screening_paid_at)}</dd></div>
                                  </dl>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Uppvinnsla</div>
                                  <dl className="space-y-1 text-xs">
                                    <div className="flex justify-between"><dt className="text-gray-500">Tilvísun</dt><dd>{r.workup_reference || '—'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-gray-500">Upphæð</dt><dd>{kr(r.workup_amount)}</dd></div>
                                    <div className="flex justify-between"><dt className="text-gray-500">Staða</dt><dd>{r.workup_payment_status || '—'}</dd></div>
                                    <div className="flex justify-between"><dt className="text-gray-500">Greitt</dt><dd>{fmt(r.workup_paid_at)}</dd></div>
                                  </dl>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 rounded border bg-white p-3">
                            <div className="font-medium mb-2">Form</div>
                            {(!r.forms || r.forms.length === 0) ? (
                              <div className="text-sm text-gray-500">Engin form skráð.</div>
                            ) : (
                              <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {r.forms.map(f => (
                                  <li key={f.id} className={`rounded border p-2 ${f.submission ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <div className="text-sm font-medium truncate">{f.name}</div>
                                    <div className="text-xs text-gray-600">Tally: {f.tally_id}</div>
                                    <div className="text-xs">{f.submission ? `Skilað (#${f.submission})` : 'Ekki skilað'}</div>
                                    <div className="text-xs text-gray-500">{fmt(f.completed_at)}</div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Finance Modal */}
      {financeModal && (
        <StaffFinanceModal
          kennitala={financeModal.kennitala}
          clientName={financeModal.name}
          isOpen={true}
          onClose={() => setFinanceModal(null)}
        />
      )}
    </section>
  );
}
