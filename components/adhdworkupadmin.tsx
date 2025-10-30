'use client';

import React, { useEffect, useMemo, useState } from 'react';

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
   Small utils
   -------------------------------------------------------------------------- */

const fetchJSON = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
};

const fmt = (s?: string | null) => {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
};

const kr = (n?: number | null) => (n == null ? '—' : `${Math.round(n).toLocaleString('is-IS')} kr.`);

/* --------------------------------------------------------------------------
   Component
   -------------------------------------------------------------------------- */

export default function ADHDWorkupAdminTable() {
  const [rows, setRows] = useState<WorkupRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchJSON<WorkupRow[]>(`${API_BASE}/signet/transfer/adhdworkup/admin/`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Tókst ekki að sækja gögn.');
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

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">ADHD – vinnsluyfirlit</h2>
        <div className="flex items-center gap-2">
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Leita (nafn, kennitala, ID)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50" onClick={load} disabled={loading}>
            Endurhlaða
          </button>
        </div>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}

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
                              <div className="font-medium mb-2">Skimun</div>
                              <dl className="space-y-1">
                                <div className="flex justify-between"><dt className="text-gray-500">Tilvísun</dt><dd>{r.screening_reference || '—'}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Vara</dt><dd>{r.screening_item_article || '—'}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Upphæð</dt><dd>{kr(r.screening_amount)}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Greiðslustaða</dt><dd>{r.screening_payment_status || '—'}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Greitt</dt><dd>{fmt(r.screening_paid_at)}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Auth-kóði</dt><dd>{r.screening_authorisation_code || '—'}</dd></div>
                              </dl>
                            </div>

                            <div className="rounded border bg-white p-3">
                              <div className="font-medium mb-2">Uppvinnsla</div>
                              <dl className="space-y-1">
                                <div className="flex justify-between"><dt className="text-gray-500">Tilvísun</dt><dd>{r.workup_reference || '—'}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Vara</dt><dd>{r.workup_item_article || '—'}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Upphæð</dt><dd>{kr(r.workup_amount)}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Greiðslustaða</dt><dd>{r.workup_payment_status || '—'}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Greitt</dt><dd>{fmt(r.workup_paid_at)}</dd></div>
                                <div className="flex justify-between"><dt className="text-gray-500">Auth-kóði</dt><dd>{r.workup_authorisation_code || '—'}</dd></div>
                              </dl>
                            </div>
                          </div>

                          <div className="mt-3 rounded border bg-white p-3">
                            <div className="font-medium mb-2">Form</div>
                            {(!r.forms || r.forms.length === 0) ? (
                              <div className="text-sm text-gray-500">Engin form skráð.</div>
                            ) : (
                              <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {r.forms.map(f => (
                                  <li key={f.id} className={`rounded border p-2 ${f.submission ? 'opacity-60 italic' : ''}`}>
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
    </section>
  );
}
