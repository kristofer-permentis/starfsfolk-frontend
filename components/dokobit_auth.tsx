'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  apiBase: string;               // e.g. "http://localhost:8000"
  sessionId?: string;            // optional extra header alongside cookies
  children: React.ReactNode;

  // NEW: notify parent to start/stop bounded polling
  onBeginLogin?: () => void;
  onLoginFinished?: (ok: boolean) => void;
};

type CurrentUser = Record<string, unknown>;

const FETCH_OPTS = (sessionId?: string) => ({
  credentials: 'include' as const, // always send Django session cookie
  headers: sessionId ? { 'X-Session-ID': sessionId } : undefined,
});

const isEmptyObject = (x: unknown) =>
  !!x && typeof x === 'object' && Object.keys(x as object).length === 0;

export default function Authentication({
  apiBase,
  sessionId,
  children,
  onBeginLogin,
  onLoginFinished,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<CurrentUser | null>(null);

  // UI state
  const [mode, setMode] = useState<'app' | 'mobile'>('mobile'); // kennitala vs símanúmer
  const [input, setInput] = useState('');
  const [err, setErr] = useState<string | null>(null);

  // Flow state
  const [waitingMsg, setWaitingMsg] = useState<string | null>(null);
  const [controlCode, setControlCode] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string | null>(null);

  // Polling machinery (timeout loop, not interval)
  const pollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCancelled = useRef(false);
  const pollDeadline = useRef<number>(0);

  // Endpoints
  const currentUserUrl = useMemo(() => `${apiBase}/api/umbod/currentuser/`, [apiBase]);
  const initiateUrl    = useMemo(() => `${apiBase}/api/dokobit_auth/initiate/`, [apiBase]);
  const pollingUrl     = useMemo(() => `${apiBase}/api/dokobit_auth/polling/`, [apiBase]);

  /* ------------------------ Initial auth check ------------------------ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(currentUserUrl, { method: 'GET', ...FETCH_OPTS(sessionId) });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && !isEmptyObject(data)) {
          setUser(data);
          // If parent cares, this effectively means "already authed"
          onLoginFinished?.(true);
        }
      } catch {
        // unauthenticated is fine — show the form
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUserUrl, sessionId, onLoginFinished]);

  /* ---------------------- Cleanup timer on unmount -------------------- */
  useEffect(() => () => { stopPolling(); }, []);

  /* ----------------------------- Handlers ----------------------------- */
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    const max = mode === 'app' ? 10 : 7;
    setInput(digits.slice(0, max));
    setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const digits = input.replace(/\D/g, '');
    if (mode === 'app' && digits.length !== 10) {
      setErr('Kennitala þarf að vera 10 tölustafir.');
      return;
    }
    if (mode === 'mobile' && digits.length !== 7) {
      setErr('Símanúmer þarf að vera 7 tölustafir.');
      return;
    }

    const body: Record<string, string> = { auth_type: mode };
    if (mode === 'app') body.kennitala = digits;
    else body.phone = digits;
    if (sessionId) body.session_id = sessionId;

    try {
      const res = await fetch(initiateUrl, {
        method: 'POST',
        ...FETCH_OPTS(sessionId),
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'X-Session-ID': sessionId } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('initiate failed');

      const data = await res.json().catch(() => ({} as any));
      const ct = data?.client_token;
      const cc = data?.control_code;
      if (!ct || !cc) {
        setErr('Villa í auðkenningu.');
        return;
      }

      setClientToken(ct);
      setControlCode(cc);
      setWaitingMsg(`Beðið eftir auðkenningu.

Öryggistalan ${cc} ætti að birtast á skjánum þínum (þessi tala er ekki PIN númerið).

Vinsamlegast samþykktu auðkenninguna aðeins ef þessi öryggistala er með.`);
      setInput('');

      // Tell parent to start its bounded polling
      onBeginLogin?.();

      // Start internal polling with fresh captured values (self-scheduling loop)
      startPolling(ct, mode);
    } catch {
      setErr('Villa í auðkenningu.');
      onLoginFinished?.(false);
    }
  };

  /* ---------------------- Polling (timeout loop) ---------------------- */
  const startPolling = (ct: string, m: 'app' | 'mobile') => {
    pollCancelled.current = false;
    pollDeadline.current = Date.now() + 120_000; // 120 s
    pollLoop(ct, m);
  };

  const pollLoop = async (ct: string, m: 'app' | 'mobile') => {
    if (pollCancelled.current) return;

    if (Date.now() > pollDeadline.current) {
      stopPolling();
      setErr('Villa í auðkenningu. Tími rann út.');
      resetWaiting();
      onLoginFinished?.(false);
      return;
    }

    const url = new URL(pollingUrl);
    url.searchParams.set('auth_type', m);
    url.searchParams.set('client_token', ct);

    try {
      const res = await fetch(url.toString(), { method: 'GET', ...FETCH_OPTS(sessionId) });
      const data = await res.json().catch(() => ({} as any));
      const status = data?.status;

      if (!status || status === 'waiting') {
        if (!pollCancelled.current) {
          pollTimeout.current = setTimeout(() => pollLoop(ct, m), 2000);
        }
        return;
      }

      // terminal states
      stopPolling();

      if (status === 'canceled') {
        setErr('Notandi hætti við.');
        resetWaiting(true);
        onLoginFinished?.(false);
        return;
      }

      if (status === 'ok') {
        try {
          const r2 = await fetch(currentUserUrl, { method: 'GET', ...FETCH_OPTS(sessionId) });
          const u = await r2.json().catch(() => ({}));
          if (!isEmptyObject(u)) {
            setUser(u);
            resetWaiting();
            onLoginFinished?.(true);
            return;
          }
        } catch { /* ignore */ }
        setErr('Villa í auðkenningu.');
        resetWaiting(true);
        onLoginFinished?.(false);
        return;
      }

      // any other terminal status
      setErr('Villa í auðkenningu.');
      resetWaiting(true);
      onLoginFinished?.(false);
    } catch {
      // transient issue — try again in 2s without multiplying requests
      if (!pollCancelled.current) {
        pollTimeout.current = setTimeout(() => pollLoop(ct, m), 2000);
      }
    }
  };

  const stopPolling = () => {
    pollCancelled.current = true;
    if (pollTimeout.current) {
      clearTimeout(pollTimeout.current);
      pollTimeout.current = null;
    }
  };

  const resetWaiting = (showForm = false) => {
    setWaitingMsg(null);
    setControlCode(null);
    setClientToken(null);
    if (showForm) setInput('');
  };

  /* ------------------------------- UI -------------------------------- */
  if (loading) return <div>Hleð…</div>;

  if (user && !isEmptyObject(user)) return <>{children}</>;

  const label = mode === 'app' ? 'Kennitala' : 'Símanúmer';

  return (
    <div className="max-w-md mx-auto p-4 border rounded-lg">
      {waitingMsg ? (
        <div>
          <h2 className="text-xl mb-2">Veita umboð: Innskráning</h2>
          <p className="mb-2 whitespace-pre-line">{waitingMsg}</p>
        </div>
      ) : (
        <>
          <h2 className="text-xl mb-4">Veita umboð: Innskráning</h2>

          <div className="mb-3 flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="auth_mode"
                value="mobile"
                checked={mode === 'mobile'}
                onChange={() => { setMode('mobile'); setInput(''); setErr(null); }}
              />
              <span className="ml-1">Símanúmer</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="auth_mode"
                value="app"
                checked={mode === 'app'}
                onChange={() => { setMode('app'); setInput(''); setErr(null); }}
              />
              <span className="ml-1">Kennitala (Auðkennisappið)</span>
            </label>
          </div>

          <form onSubmit={submit}>
            <label className="block mb-1">{label}</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              value={input}
              onChange={onInputChange}
              placeholder={mode === 'app' ? 'XXXXXXXXXX' : 'XXXXXXX'}
              className="w-full border px-3 py-2 rounded mb-2"
              aria-describedby="fieldHelp"
            />
            <div id="fieldHelp" className="text-sm text-gray-500 mb-2">
              {mode === 'app' ? '10 tölustafir.' : '7 tölustafir.'}
            </div>

            {err && <div className="mb-2 text-red-600">{err}</div>}

            <button type="submit" className="px-4 py-2 rounded bg-black text-white">
              Innskráning
            </button>
          </form>
        </>
      )}
    </div>
  );
}
