'use client';

import Authentication from '../components/dokobit_auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
const api_getTjodskraByName = `${API_BASE}/api/umbod/getTjodskraByName/`;
const api_getTjodskraByKennitala = `${API_BASE}/api/umbod/getTjodskraByKennitala/`;
const api_umbodsgjafi = `${API_BASE}/api/umbod/currentuser/`;
const api_umbod = `${API_BASE}/api/umbod/umbod/`;
const api_signout = `${API_BASE}/api/umbod/signout/`;

import { useEffect, useRef, useState } from 'react';

type Person = { nafn: string; kennitala: string };
type Item = { nafn: string; kennitala: string; selected: boolean };
type ApiResponse = {
  id?: number;
  nafn?: string;
  kennitala?: string;
  umbodsthegar?: Record<string, { nafn: string; kennitala: string }>;
  gildirtil?: string;
};

const normaliseKennitala = (v: string) => v.replace(/\D/g, '').slice(0, 10);
const isEmptyObject = (x: any) => x && typeof x === 'object' && Object.keys(x).length === 0;

/* ── Fetch helper with explicit unauthorised handling ─────────────────────── */
class UnauthorisedError extends Error {
  code = 'UNAUTH';
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  // Bail fast on unauthorised
  if (res.status === 401 || res.status === 403) {
    throw new UnauthorisedError('Unauthorised');
  }

  // Catch servers that 302 to an HTML login page
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    throw new UnauthorisedError('Non-JSON (likely login page)');
  }

  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/* ── Tiny, dependency-free autosuggest ───────────────────────────────────── */
function SuggestInput({
  mode,                 // 'nafn' | 'kennitala'
  value,
  onChange,
  onPick,               // called with { nafn, kennitala } after selection
  placeholder,
}: {
  mode: 'nafn' | 'kennitala';
  value: string;
  onChange: (v: string) => void;
  onPick: (p: Person) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Person[]>([]);
  const [active, setActive] = useState(0);
  const [activated, setActivated] = useState(false); // user interaction gate
  const boxRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Fetch suggestions (debounced) — only after user interacts
  useEffect(() => {
    if (!activated) return;

    const q = mode === 'kennitala' ? normaliseKennitala(value) : value.trim();
    const min = mode === 'kennitala' ? 3 : 2;
    if (q.length < min) {
      setResults([]);
      setOpen(false);
      return;
    }

    const ac = new AbortController();
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const url =
          mode === 'nafn'
            ? `${api_getTjodskraByName}?nafn=${encodeURIComponent(q)}`
            : `${api_getTjodskraByKennitala}?kennitala=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        const arr: any[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.results)
          ? json.results
          : Array.isArray(json?.data)
          ? json.data
          : [];
        const mapped: Person[] = arr
          .map((it) => ({
            nafn: String(it.nafn ?? it.name ?? ''),
            kennitala: normaliseKennitala(String(it.kennitala ?? it.ssn ?? '')),
          }))
          .filter((p) => p.nafn && p.kennitala.length === 10);
        setResults(mapped);
        setActive(0);
        setOpen(true);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [value, mode, activated]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[active];
      if (pick) {
        onPick(pick);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        value={value}
        onFocus={() => setActivated(true)}
        onChange={(e) => {
          setActivated(true);
          onChange(mode === 'kennitala'
            ? normaliseKennitala(e.target.value)
            : e.target.value);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full p-2 border rounded shadow-sm focus:ring-2 focus:ring-[#4A5459] focus:border-[#4A5459]"
        aria-autocomplete="list"
        aria-expanded={open}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {open && (
        <ul className="absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded border bg-white shadow">
          {loading && <li className="px-3 py-2 text-sm text-gray-500">Leita…</li>}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">Engar niðurstöður</li>
          )}
          {results.map((p, i) => (
            <li
              key={`${p.kennitala}-${i}`}
              className={`px-3 py-2 cursor-pointer ${i === active ? 'bg-gray-100' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(p);
                setOpen(false);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <div className="font-medium">{p.nafn}</div>
              <div className="text-xs text-gray-600">{p.kennitala}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Bounded polling helper ──────────────────────────────────────────────── */
async function pollUntil<T>(
  work: () => Promise<T | null>,
  { maxAttempts = 30, startDelayMs = 400, maxDelayMs = 1500 } = {}
): Promise<T | null> {
  let attempt = 0;
  let delay = startDelayMs;
  while (attempt < maxAttempts) {
    const out = await work();
    if (out) return out;
    attempt += 1;
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(Math.floor(delay * 1.6), maxDelayMs);
  }
  return null;
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function UmbodPage() {
  const [nafn, setNafn] = useState('');
  const [kennitala, setKennitala] = useState('');
  const [items, setItems] = useState<Item[]>([{ nafn: '', kennitala: '', selected: false }]);
  const [submitting, setSubmitting] = useState(false);

  const [loading, setLoading] = useState(true);             // initial one-shot load
  const [umbodLoading, setUmbodLoading] = useState(false);  // umboð fetch
  const [loadError, setLoadError] = useState<string | null>(null);

  // New: bounded polling state, only while login is in progress
  const [loginInProgress, setLoginInProgress] = useState(false);

  // Helpers to edit items list
  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };
  const addItem = () => setItems(prev => [...prev, { nafn: '', kennitala: '', selected: false }]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  /* Initial load: single attempts only (no loops here) */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const u: ApiResponse = await fetchJson(api_umbodsgjafi);
        if (!cancelled && u && !isEmptyObject(u)) {
          setNafn((u.nafn ?? '').trim());
          setKennitala(normaliseKennitala(String(u.kennitala ?? '')));
        }
      } catch (e: any) {
        // If unauthorised, show a gentle prompt; don’t start any loops yet
        if (e?.code === 'UNAUTH') {
          setLoadError('Þarft að skrá þig inn.');
        } else {
          setLoadError('Gat ekki sótt gögn strax. Reyndu aftur.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      // If we already have the user, try umboð once as well
      if (!cancelled && nafn && kennitala.length === 10) {
        setUmbodLoading(true);
        try {
          const d: ApiResponse = await fetchJson(api_umbod);
          const entries = d?.umbodsthegar ? Object.values(d.umbodsthegar) : [];
          if (entries.length > 0) {
            const pre: Item[] = entries.map((it: any) => ({
              nafn: (it?.nafn ?? '').trim(),
              kennitala: normaliseKennitala(String(it?.kennitala ?? '')),
              selected: true,
            }));
            setItems(pre);
          }
        } catch {
          /* ignore one-shot umboð failure */
        } finally {
          if (!cancelled) setUmbodLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  /* Bounded polling loop: runs ONLY while login is in progress */
  useEffect(() => {
    let cancelled = false;
    if (!loginInProgress) return;

    (async () => {
      // 1) Poll current user (up to ~40 attempts)
      const user = await pollUntil<ApiResponse>(async () => {
        try {
          const u: ApiResponse = await fetchJson(api_umbodsgjafi);
          if (u && !isEmptyObject(u)) return u;
        } catch (e: any) {
          if (e?.code === 'UNAUTH') return null; // keep polling; user still completing login
          throw e;                                // break on other errors
        }
        return null;
      }, { maxAttempts: 40, startDelayMs: 500, maxDelayMs: 1500 });

      if (cancelled) return;

      if (!user) {
        setLoadError('Innskráning tókst ekki innan tímamarka.');
        setLoginInProgress(false);
        return;
      }

      setNafn((user.nafn ?? '').trim());
      setKennitala(normaliseKennitala(String(user.kennitala ?? '')));

      // 2) After user appears, poll umboð for a shorter window
      setUmbodLoading(true);
      const pre = await pollUntil<Item[]>(async () => {
        try {
          const d: ApiResponse = await fetchJson(api_umbod);
          const entries = d?.umbodsthegar ? Object.values(d.umbodsthegar) : [];
          if (entries.length > 0) {
            return entries.map((it: any) => ({
              nafn: (it?.nafn ?? '').trim(),
              kennitala: normaliseKennitala(String(it?.kennitala ?? '')),
              selected: true,
            }));
          }
        } catch (e: any) {
          if (e?.code === 'UNAUTH') return null; // unlikely once user exists
          throw e;
        }
        return null;
      }, { maxAttempts: 20, startDelayMs: 600, maxDelayMs: 1200 });

      if (!cancelled && pre) setItems(pre);
      if (!cancelled) {
        setUmbodLoading(false);
        setLoginInProgress(false); // stop the loop
      }
    })();

    return () => { cancelled = true; };
  }, [loginInProgress]);

  const canSubmit =
    nafn &&
    kennitala.length === 10 &&
    items.length > 0 &&
    items.every((it) => it.nafn.trim() && it.kennitala.length === 10 && it.selected) &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    const payload = {
      nafn: nafn.trim(),
      kennitala,
      umbodsthegar: items.map(({ nafn, kennitala }) => ({
        nafn: nafn.trim(),
        kennitala,
      })),
    };
    await fetch(`${api_umbod}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    alert('Skráning send.');
  };

  const handleSignOut = async () => {
    try {
      await fetch(api_signout, {
        method: 'GET',                      // GET-only API
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      window.location.reload();            // remounts <Authentication/> → login UI
    } catch {
      alert('Tókst ekki að skrá út. Reyndu aftur.');
    }
  };

return (
  <Authentication
    apiBase={process.env.NEXT_PUBLIC_API_BASE!}
    onBeginLogin={() => setLoginInProgress(true)}
    onLoginFinished={() => setLoginInProgress(false)}
  >
      <div className="max-w-screen-xl mx-auto px-4 pt-4">
        {loading && <div className="mb-4 text-sm text-gray-600">Sæki gögn…</div>}
        {loadError && (
          <div className="mb-4 text-sm text-red-700 border border-red-300 bg-red-50 p-3 rounded">
            {loadError}{' '}
            {!loginInProgress && (
              <button
                type="button"
                onClick={() => setLoginInProgress(true)}
                className="underline"
                title="Byrja tímabundna leit á innskráningu"
              >
                Ég er að skrá mig inn — athuga aftur
              </button>
            )}
          </div>
        )}
        {loginInProgress && !loading && (
          <div className="mb-4 text-sm text-gray-600">
            Bíð eftir innskráningu… (prófa að sækja gögn í stutta stund)
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Skjólstæðingur / umboðsgjafi</h2>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm px-3 py-1 border rounded text-red-700 border-red-300 hover:bg-red-50 disabled:opacity-60"
            title="Skrá út"
          >
            Skrá út
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fixed identity (from auth/backend) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nafn</label>
              <p className="text-gray-900">{nafn}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kennitala</label>
              <p className="text-gray-900">{kennitala}</p>
            </div>
          </div>

          {/* Soft note while umboð still loading in background */}
          {(!loadError && umbodLoading) && (
            <div className="text-sm text-gray-600">
              Sæki umboð… þetta getur tekið örfáar sekúndur eftir innskráningu.
            </div>
          )}

          {/* Umbodsthegar with autosuggest on both fields */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Umboðsþegar, sem mega fá upplýsingar og koma fram fyrir hönd
                skjólstæðings/umboðsþega gagnvart Per mentis
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="text-sm text-[--pm-blue] hover:underline"
              >
                + Bæta við línu (umboðsþega)
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nafn</label>
                  <SuggestInput
                    mode="nafn"
                    value={item.nafn}
                    onChange={(v) => updateItem(idx, { nafn: v, selected: false })}
                    placeholder="Leita að nafni…"
                    onPick={(p) =>
                      updateItem(idx, { nafn: p.nafn, kennitala: p.kennitala, selected: true })
                    }
                  />
                  {!item.selected && item.nafn && (
                    <p className="mt-1 text-xs text-amber-700">Veldu úr lista til að staðfesta.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kennitala</label>
                    <SuggestInput
                      mode="kennitala"
                      value={item.kennitala}
                      onChange={(v) => updateItem(idx, { kennitala: v, selected: false })}
                      placeholder="Leita að kennitölu…"
                      onPick={(p) =>
                        updateItem(idx, { nafn: p.nafn, kennitala: p.kennitala, selected: true })
                      }
                    />
                    {!item.selected && item.kennitala && (
                      <p className="mt-1 text-xs text-amber-700">Veldu úr lista til að staðfesta.</p>
                    )}
                  </div>
                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="px-3 py-2 border rounded text-sm text-gray-600 hover:bg-gray-100"
                      aria-label="Fjarlægja atriði"
                      title="Fjarlægja"
                    >
                      Fjarlægja
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="pt-2 text-right">
            <button
              type="submit"
              disabled={!canSubmit}
              className="bg-[--pm-blue] text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60 bg-blue-700"
              title={!canSubmit ? 'Veldu alla umboðshafa úr lista' : 'Skrá breytingar'}
            >
              Skrá breytingar
            </button>
          </div>
        </form>
      </div>
    </Authentication>
  );
}
