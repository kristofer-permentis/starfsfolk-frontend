'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

/* ============================================================================
   Types
   ========================================================================== */

type ForWhom = 'self' | 'other'; // kept for compatibility if your API returns it

type FormRequestRow = {
  id: number;
  // NOTE: "name" here is the form title as returned by your API example
  name: string;
  form_name?: string | null;    // optional field if your backend provides it
  tally_id: string;
  submission?: number | null;
  requester_text?: string | null;
  valid_from?: string | null;   // ISO-ish string from API
  valid_to?: string | null;     // ISO-ish string from API
  for_whom?: ForWhom;

  // NEW: explicitly include client identity for display
  user_name?: string | null;
  user_kennitala?: string | null;
};

type TallyForm = {
  name: string;                 // catalogue form name
  tally_id: string;
  submission: number | null;
  form_url: string;
  for_other: boolean;
};

type PersonHit = {
  name: string;
  kennitala: string;
  label: string; // “Nafn — 0000000000”
};

/* ============================================================================
   Small utils
   ========================================================================== */

const BASE = '/signet/transfer'; // unchanged

const STAFF_ABSOLUTE_API = 'https://minarsidur.permentis.is/api/staffchangeuser/';

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

const debounce = <F extends (...args: any[]) => void>(fn: F, ms = 250) => {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// Normalise datetime-local <-> ISO without seconds/timezone fuss
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (val: string) => (val?.trim() ? val.trim() : null);

/* ============================================================================
   Þjóðskrá search helpers (unchanged)
   ========================================================================== */

const searchByKennitala = async (kennitala: string): Promise<PersonHit[]> => {
  const kt = kennitala.trim();
  if (!kt) return [];
  const data = await fetchJSON<any[]>(`${BASE}/getTjodskraByKennitala/?kennitala=${encodeURIComponent(kt)}`);
  return (data || []).map((row) => ({
    name: row.nafn ?? row.name ?? '',
    kennitala: row.kennitala ?? row.kt ?? '',
    label: `${row.nafn ?? row.name ?? ''} — ${row.kennitala ?? row.kt ?? ''}`,
  }));
};

const searchByName = async (name: string): Promise<PersonHit[]> => {
  const q = name.trim();
  if (!q) return [];
  const data = await fetchJSON<any[]>(`${BASE}/getTjodskraByName/?name=${encodeURIComponent(q)}`);
  return (data || []).map((row) => ({
    name: row.nafn ?? row.name ?? '',
    kennitala: row.kennitala ?? row.kt ?? '',
    label: `${row.nafn ?? row.name ?? ''} — ${row.kennitala ?? row.kt ?? ''}`,
  }));
};

/* ============================================================================
   Component
   ========================================================================== */

export default function FormRequestAdmin() {
  // list
  const [rows, setRows] = useState<FormRequestRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  // forms catalogue
  const [forms, setForms] = useState<TallyForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);

  // create/edit shared panel state
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  // person fields
  const [kt, setKT] = useState('');
  const [personName, setPersonName] = useState('');
  const [suggestions, setSuggestions] = useState<PersonHit[]>([]);
  const [pickedPerson, setPickedPerson] = useState<PersonHit | null>(null);

  // NEW: alternative staff dropdown (absolute URL)
  const [staffOptions, setStaffOptions] = useState<PersonHit[]>([]);
  const [staffListError, setStaffListError] = useState<string>('');

  // form fields (shared by create & edit)
  const [formTallyId, setFormTallyId] = useState('');
  const [requesterText, setRequesterText] = useState('');
  const [validFrom, setValidFrom] = useState(''); // datetime-local value
  const [validTo, setValidTo] = useState('');

  // edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const isEditing = editingId !== null;

  // load rows
  const loadRows = async () => {
    setLoadingRows(true);
    setError('');
    try {
      const data = await fetchJSON<FormRequestRow[]>(`${BASE}/formrequestadmin/`);
      setRows(data);
    } catch (e: any) {
      setError(e.message || 'Villa við að sækja beiðnir.');
    } finally {
      setLoadingRows(false);
    }
  };

  // load forms list
  const loadForms = async () => {
    setLoadingForms(true);
    setError('');
    try {
      const data = await fetchJSON<TallyForm[]>(`${BASE}/formsall/`);
      setForms(data);
    } catch (e: any) {
      setError(e.message || 'Villa við að sækja form.');
      setForms([]);
    } finally {
      setLoadingForms(false);
    }
  };

  // NEW: load absolute staff list for dropdown
  useEffect(() => {
    (async () => {
      try {
        setStaffListError('');
        const raw: any = await fetchJSON<any>(STAFF_ABSOLUTE_API);
        let arr: any[] = [];
        if (Array.isArray(raw)) arr = raw;
        else if (Array.isArray(raw?.results)) arr = raw.results;
        else if (Array.isArray(raw?.data)) arr = raw.data;
        else if (raw && typeof raw === 'object' && (('name' in raw) || ('kennitala' in raw) || ('kt' in raw))) {
          arr = [raw];
        }
        const mapped: PersonHit[] = (arr || [])
          .map((row) => ({
            name: row.name ?? row.nafn ?? '',
            kennitala: row.kennitala ?? row.kt ?? '',
            label: `${row.name ?? row.nafn ?? ''} — ${row.kennitala ?? row.kt ?? ''}`,
          }))
          .filter((x) => x.name && x.kennitala);
        setStaffOptions(mapped);
      } catch (e: any) {
        setStaffListError(e?.message || 'Gat ekki sótt lista.');
        setStaffOptions([]);
      }
    })();
  }, []);

  useEffect(() => {
    loadRows();
    loadForms();
  }, []);

  // Selected form name from catalogue (used for form_name in payloads)
  const selectedFormName = useMemo(
    () => forms.find((f) => f.tally_id === formTallyId)?.name || '',
    [forms, formTallyId],
  );

  // live suggestions for person
  const debouncedSuggestRef = useRef(
    debounce(async (ktVal: string, nmVal: string) => {
      try {
        const list = ktVal ? await searchByKennitala(ktVal) : await searchByName(nmVal);
        setSuggestions(list.slice(0, 12));
      } catch {
        setSuggestions([]);
      }
    }, 250),
  );

  useEffect(() => {
    const a = kt.trim();
    const b = personName.trim();
    if (!a && !b) {
      setSuggestions([]);
      return;
    }
    debouncedSuggestRef.current(a, b);
  }, [kt, personName]);

  const pickSuggestion = (p: PersonHit) => {
    setPickedPerson(p);
    setKT(p.kennitala);
    setPersonName(p.name);
    setSuggestions([]);
  };

  /* ------------------------------------------------------------------------
     Open panel (create or edit)
     ---------------------------------------------------------------------- */

  const resetPanel = () => {
    setPickedPerson(null);
    setKT('');
    setPersonName('');
    setFormTallyId('');
    setRequesterText('');
    setValidFrom('');
    setValidTo('');
    setEditingId(null);
  };

  const openCreate = () => {
    resetPanel();
    setOpen(true);
  };

  const openEdit = (row: FormRequestRow) => {
    // For editing we do not allow changing kennitala (server fills user_id from it on create).
    setEditingId(row.id);
    setKT(''); // not used on update
    setPersonName(row.user_name || ''); // display only; edits don't resubmit KT
    setFormTallyId(row.tally_id || '');
    setRequesterText(row.requester_text || '');
    setValidFrom(toLocalInput(row.valid_from));
    setValidTo(toLocalInput(row.valid_to));
    setOpen(true);
  };

  /* ------------------------------------------------------------------------
     Create / Update / Delete
     ---------------------------------------------------------------------- */

  const submitCreate = async () => {
    setError('');
    try {
      // robust: if user typed KT but didn’t pick
      let person = pickedPerson;
      if (!person && kt.trim()) {
        const hits = await searchByKennitala(kt.trim());
        person = hits[0] ?? null;
      }
      if (!person?.kennitala || !formTallyId) {
        setError('Veldu skjólstæðing (kennitala) og form.');
        return;
      }

      // include form_name taken from the catalogue (unchanged behaviour otherwise)
      const payload = {
        kennitala: person.kennitala,
        name: person.name,                 // person’s name for backend if needed
        form_name: selectedFormName || '', // optional
        tally_id: formTallyId,
        requester_text: requesterText || null,
        valid_from: fromLocalInput(validFrom),
        valid_to: fromLocalInput(validTo),
      };

      await fetchJSON<FormRequestRow>(`${BASE}/formrequestadmin/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setOpen(false);
      resetPanel();
      await loadRows();
    } catch (e: any) {
      setError(e.message || 'Tókst ekki að stofna beiðni.');
    }
  };

  const submitUpdate = async () => {
    if (editingId == null) return;
    setError('');
    try {
      const payload = {
        name: personName || '',           // keep field names as before
        form_name: selectedFormName || '',
        tally_id: formTallyId || '',
        requester_text: requesterText || null,
        valid_from: fromLocalInput(validFrom),
        valid_to: fromLocalInput(validTo),
      };
      await fetchJSON<FormRequestRow>(`${BASE}/formrequestadmin/${editingId}/`, {
        method: 'PATCH', // partial update
        body: JSON.stringify(payload),
      });

      setOpen(false);
      resetPanel();
      await loadRows();
    } catch (e: any) {
      setError(e.message || 'Tókst ekki að uppfæra beiðni.');
    }
  };

  const doDelete = async (id: number) => {
    setError('');
    try {
      await fetchJSON<void>(`${BASE}/formrequestadmin/${id}/`, { method: 'DELETE' });
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e.message || 'Eyðing mistókst.');
    }
  };

  /* ==========================================================================
     Render
     ======================================================================== */

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Beiðnir um spurningalista</h2>
          <h3 className="text-xl font-semibold">ATH: Til að nota gervinotendur þarf að vera loggaður inn á Mínar síður</h3>
        <button className="rounded-xl px-4 py-2 border hover:bg-gray-50" onClick={openCreate}>
          Ný beiðni
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Panel: Create / Edit */}
      {open && (
        <div className="rounded-2xl border p-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Left column: person (create only) + meta */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Skjólstæðingur (Þjóðskrá)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    className="border rounded px-3 py-2"
                    placeholder="Kennitala"
                    value={kt}
                    onChange={(e) => {
                      setKT(e.target.value);
                      setPickedPerson(null);
                    }}
                    disabled={isEditing} // kennitala only used on create
                  />
                  <input
                    className="border rounded px-3 py-2"
                    placeholder="Nafn"
                    value={personName}
                    onChange={(e) => {
                      setPersonName(e.target.value);
                      if (!isEditing) setPickedPerson(null);
                    }}
                    disabled={isEditing && true /* keep behaviour identical when editing */}
                  />
                </div>

                {!isEditing && suggestions.length > 0 && (
                  <div className="border rounded mt-2 max-h-56 overflow-auto text-sm bg-white">
                    {suggestions.map((p) => (
                      <button
                        key={`${p.kennitala}:${p.name}`}
                        type="button"
                        className="block w-full text-left px-2 py-1 hover:bg-gray-50"
                        onClick={() => pickSuggestion(p)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                {!isEditing && pickedPerson && (
                  <p className="text-xs text-gray-500 mt-1">
                    Valið: {pickedPerson.name} — {pickedPerson.kennitala}
                  </p>
                )}
              </div>

              {/* NEW: Alternative selection via absolute dropdown */}
              {!isEditing && (
                <div className="pt-2">
                  <label className="block text-sm text-gray-600 mb-1">Eða: Veldu úr lista</label>
                  <select
                    className="w-full border rounded px-3 py-2 bg-white"
                    value={pickedPerson ? pickedPerson.kennitala : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) { setPickedPerson(null); return; }
                      const match = staffOptions.find((x) => x.kennitala === value) || null;
                      if (match) { pickSuggestion(match); } else { setPickedPerson(null); }
                    }}
                  >
                    <option value="">— Veldu úr lista —</option>
                    {staffOptions.length > 0 ? (
                      staffOptions.map((p) => (
                        <option key={p.kennitala} value={p.kennitala}>
                          {p.label}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>(Enginn listi eða tómur)</option>
                    )}
                  </select>
                  {staffListError && (
                    <p className="mt-1 text-xs text-red-600">{staffListError}</p>
                  )}
                  {!staffListError && staffOptions.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      (Listi ekki tiltækur núna; þú getur samt notað leitina hér að ofan.)
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-600 mb-1">Athugasemd (requester_text)</label>
                <textarea
                  className="border rounded px-3 py-2 w-full min-h-[72px]"
                  value={requesterText}
                  onChange={(e) => setRequesterText(e.target.value)}
                  placeholder="(valfrjálst)"
                />
              </div>
            </div>

            {/* Right column: form & validity */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Form</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={formTallyId}
                  onChange={(e) => setFormTallyId(e.target.value)}
                >
                  <option value="">— Velja —</option>
                  {forms.map((f) => (
                    <option key={f.tally_id} value={f.tally_id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                {selectedFormName && (
                  <p className="text-xs text-gray-500 mt-1">Valið form: {selectedFormName}</p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Gildir frá</label>
                  <input
                    type="datetime-local"
                    className="border rounded px-3 py-2 w-full"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Gildir til</label>
                  <input
                    type="datetime-local"
                    className="border rounded px-3 py-2 w-full"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
                  onClick={submitUpdate}
                >
                  Vista breytingar
                </button>
                <button className="px-4 py-2 rounded border" onClick={() => { setOpen(false); resetPanel(); }}>
                  Hætta við
                </button>
              </>
            ) : (
              <>
                <button
                  className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
                  onClick={submitCreate}
                >
                  Stofna
                </button>
                <button className="px-4 py-2 rounded border" onClick={() => { setOpen(false); resetPanel(); }}>
                  Hætta við
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-2xl border">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-medium">Beiðnir</div>
          <button className="text-sm underline" onClick={loadRows} disabled={loadingRows}>
            Endurhlaða
          </button>
        </div>

        {loadingRows ? (
          <div className="p-4 text-sm text-gray-500">Hleð…</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Engar beiðnir fundust.</div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id} className="p-3 flex items-center gap-3 justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {/* Show form title and tally ID (unchanged) */}
                    {r.name} <span className="text-gray-400">·</span> {r.tally_id}
                  </div>

                  {/* NEW: show client identity from API */}
                  {(r.user_name || r.user_kennitala) && (
                    <div className="text-xs text-gray-700">
                      {r.user_name ? r.user_name : '(óþekkt nafn)'}
                      {r.user_kennitala ? ` — ${r.user_kennitala}` : ''}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 space-x-2">
                    {typeof r.submission === 'number'
                      ? <span className="italic text-green-700">Skilað (#{r.submission})</span>
                      : <span className="italic text-gray-500">Ekki skilað</span>}
                    {r.requester_text ? <span>· „{r.requester_text}“</span> : null}
                    {r.valid_from ? <span>· frá {new Date(r.valid_from).toLocaleString()}</span> : null}
                    {r.valid_to ? <span>· til {new Date(r.valid_to).toLocaleString()}</span> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="px-3 py-1.5 rounded border hover:bg-gray-50"
                    onClick={() => openEdit(r)}
                    title="Breyta"
                  >
                    Breyta
                  </button>
                  <button
                    className="px-3 py-1.5 rounded border hover:bg-gray-50"
                    onClick={() => doDelete(r.id)}
                    title="Eyða"
                  >
                    Eyða
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Optional: Forms catalogue helper (unchanged) */}
      <div className="rounded-2xl border">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-medium">Tiltæk form</div>
          <button className="text-sm underline" onClick={loadForms} disabled={loadingForms}>
            Endurhlaða
          </button>
        </div>
        {loadingForms ? (
          <div className="p-4 text-sm text-gray-500">Hleð…</div>
        ) : forms.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">Engin form fundust.</div>
        ) : (
          <ul className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
            {forms
              .sort((a, b) => {
                const as = a.submission ? 1 : 0;
                const bs = b.submission ? 1 : 0;
                return as - bs || a.name.localeCompare(b.name);
              })
              .map((f) => (
                <li key={f.tally_id} className={`rounded border p-2 ${f.submission ? 'opacity-60 italic' : ''}`}>
                  <div className="text-sm font-medium truncate">{f.name}</div>
                  {f.submission ? (
                    <div className="text-xs text-gray-500">Þetta form virðist þegar hafa verið skilað.</div>
                  ) : (
                    <a className="text-xs underline text-blue-700" href={f.form_url} target="_blank" rel="noreferrer">
                      Opna form
                    </a>
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
