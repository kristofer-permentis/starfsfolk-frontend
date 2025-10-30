// ✅ SendMessageForm.tsx — autosuggest, backend sync, row delete, full reset, onBlur contact updates
// + company/group mode with searchable company list and dependent group dropdown

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TjodskraAutosuggest from './TjodskraAutosuggest';
import { authService } from '@/lib/authService';
import { fetchWithAuth } from '@/lib/fetchWithAuth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

interface Receiver {
  name: string;
  ssn: string;
  tel: string;
  email: string;
}

interface Company {
  CompanyName: string;
  SerialNumber: string; // kt fyrir fyrirtæki
}

interface CompanyGroup {
  ID: number;
  Name: string;
  Description?: string | null;
  Company: string; // SerialNumber
}

const emptyReceiver: Receiver = { name: '', ssn: '', tel: '', email: '' };

function cleanContactValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') {
    const t = v.trim();
    if (t === '{}' || t.toLowerCase() === 'null') return '';
    return t;
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const candidate = (o as any).value ?? (o as any).tel ?? (o as any).email ?? '';
    return cleanContactValue(candidate);
  }
  return '';
}

async function parseContactResponse(res: Response): Promise<string> {
  try {
    const data = await res.clone().json();
    return cleanContactValue(data);
  } catch {
    const text = await res.text();
    return cleanContactValue(text);
  }
}

export default function SendMessageForm() {
  // ── Existing individual mode state ─────────────────────────────────────────────
  const [receivers, setReceivers] = useState<Receiver[]>([{ ...emptyReceiver }]);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [sendNotification, setSendNotification] = useState(true);
  const [emailMessage, setEmailMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetNonce, setResetNonce] = useState(0); // force remount on reset
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── New: mode + company/group state ───────────────────────────────────────────
  const [sendMode, setSendMode] = useState<'individual' | 'company'>('individual');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const [companyInput, setCompanyInput] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // ── Helpers for individual mode ───────────────────────────────────────────────
  const updateReceiverField = (index: number, field: keyof Receiver, value: string) => {
    const updated = [...receivers];
    updated[index][field] = cleanContactValue(value);
    setReceivers(updated);
  };

  const addReceiver = () => setReceivers((prev) => [...prev, { ...emptyReceiver }]);
  const removeReceiver = (index: number) =>
    setReceivers((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  const fetchContactInfo = async (ssn: string, index: number) => {
    if (!ssn) return;
    const token = await authService.getToken();
    const [telRes, emailRes] = await Promise.all([
      fetchWithAuth(
        `${API_BASE}/signet/transfer/TelByKennitala/?kennitala=${encodeURIComponent(ssn)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      fetchWithAuth(
        `${API_BASE}/signet/transfer/EmailByKennitala/?kennitala=${encodeURIComponent(ssn)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
    ]);
    const tel = await parseContactResponse(telRes);
    const email = await parseContactResponse(emailRes);
    updateReceiverField(index, 'tel', tel);
    updateReceiverField(index, 'email', email);
  };

  const updateContact = async (ssn: string, field: 'tel' | 'email', value: string) => {
    if (!ssn) return; // don’t POST updates if SSN is unknown
    const clean = cleanContactValue(value);
    try {
      const token = await authService.getToken();
      await fetchWithAuth(
        `${API_BASE}/signet/transfer/${field === 'tel' ? 'TelByKennitala' : 'EmailByKennitala'}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ kennitala: ssn, [field]: clean }),
        }
      );
    } catch (err) {
      console.warn('updateContact failed:', err);
    }
  };

  // ── New: company + group behaviours ───────────────────────────────────────────
  // Load all companies on mount
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCompaniesLoading(true);
        setCompaniesError(null);
        const token = await authService.getToken();
        const resp = await fetchWithAuth(`${API_BASE}/signet/transfer/getcompanylist`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (alive) setCompanies(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (alive) setCompaniesError(e?.message || 'Villa við að sækja fyrirtækjalista.');
      } finally {
        if (alive) setCompaniesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // When a company is set, fetch its groups
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!selectedCompany?.SerialNumber) {
        setGroups([]);
        setSelectedGroupId(null);
        return;
      }
      try {
        setGroupsLoading(true);
        setGroupsError(null);
        const token = await authService.getToken();
        const url = `${API_BASE}/signet/transfer/getgroupsbycompany/${selectedCompany.SerialNumber}/`;
        const resp = await fetchWithAuth(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (alive) setGroups(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (alive) setGroupsError(e?.message || 'Villa við að sækja hópa.');
      } finally {
        if (alive) setGroupsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedCompany?.SerialNumber]);

  // Narrow company list as the user types
  const filteredCompanies = useMemo(() => {
    const q = companyInput.trim().toLowerCase();
    if (!q) return companies;
    const digits = q.replace(/\D/g, '');
    return companies.filter(
      (c) =>
        c.CompanyName.toLowerCase().includes(q) ||
        (digits && c.SerialNumber.includes(digits))
    );
  }, [companyInput, companies]);

  // Attempt to lock selection from input text
  const matchCompanyFromInput = (val: string): Company | null => {
    const trimmed = val.trim();
    if (!trimmed) return null;

    // Prefer exact serial if typed
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) {
      const bySerial = companies.find((c) => c.SerialNumber === digits);
      if (bySerial) return bySerial;
    }

    // Match "Name (Serial)"
    const m = trimmed.match(/\((\d{10})\)\s*$/);
    if (m) {
      const bySerial = companies.find((c) => c.SerialNumber === m[1]);
      if (bySerial) return bySerial;
    }

    // Fallback: exact name match
    const byName = companies.find((c) => c.CompanyName === trimmed);
    return byName || null;
  };

  const handleCompanyBlur = () => {
    const match = matchCompanyFromInput(companyInput);
    setSelectedCompany(match);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setReceivers([{ ...emptyReceiver }]);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setNotes('');
    setEmailMessage('');
    setSendNotification(true);
    setResetNonce((n) => n + 1);

    // Also reset company mode bits
    setSelectedCompany(null);
    setCompanyInput('');
    setGroups([]);
    setSelectedGroupId(null);
    // Keep current sendMode as-is (user choice)
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert('Vantar skrá.');
      return;
    }

    if (sendMode === 'individual') {
      // Original validations
      if (receivers.length === 0 || receivers.some((r) => !r.ssn)) {
        alert('Vantar kennitölu fyrir alla viðtakendur.');
        return;
      }
    } else {
      // Company validations
      if (!selectedCompany) {
        alert('Vinsamlegast veldu fyrirtæki/stofnun.');
        return;
      }
      if (!selectedGroupId) {
        alert('Vinsamlegast veldu hóp.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = await authService.getToken();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('Notes', notes || '');
      formData.append('SendMail', sendNotification ? 'True' : 'False');

      if (sendMode === 'company') {
        // 🔁 Switch to Groups instead of Receivers
        formData.append('Groups', JSON.stringify([selectedGroupId]));
      } else {
        // ✅ Original individual payload untouched
        const receiversPayload = receivers.map((r) => ({
          Name: r.name || null,
          SSN: r.ssn || null,
          Email: cleanContactValue(r.email) || null,
          Mobile: cleanContactValue(r.tel) || null,
          Message: emailMessage ? emailMessage : null,
          Notify: true,
          Fetched: null,
          AuthData: null,
          FetchData: null,
        }));
        formData.append('Receivers', JSON.stringify(receiversPayload));
      }

      const resp = await fetch(`${API_BASE}/signet/transfer/SendMessage/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(errText || `Villa kom upp (${resp.status}).`);
      }

      alert('Skrá send!');
      resetForm();
    } catch (err: any) {
      alert(`Tókst ekki að senda: ${err?.message ?? err}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mode selector */}
      <div className="mb-2 space-x-6">
        <span className="font-medium">Val á móttakanda:</span>
        <label className="inline-flex items-center space-x-2">
          <input
            type="radio"
            name="sendMode"
            value="individual"
            checked={sendMode === 'individual'}
            onChange={() => setSendMode('individual')}
          />
          <span>Senda til einstaklings/einstaklinga</span>
        </label>
        <label className="inline-flex items-center space-x-2">
          <input
            type="radio"
            name="sendMode"
            value="company"
            checked={sendMode === 'company'}
            onChange={() => setSendMode('company')}
          />
          <span>Senda til fyrirtækis/stofnunar</span>
        </label>
      </div>

      {/* Individual mode (unchanged) */}
      {sendMode === 'individual' && (
        <>
          {receivers.map((receiver, index) => (
            <div key={`${index}-${resetNonce}`} className="grid grid-cols-4 gap-2">
              <TjodskraAutosuggest
                value={receiver.name || receiver.ssn}
                onSelect={(entry: any) => {
                  updateReceiverField(index, 'name', entry.nafn);
                  updateReceiverField(index, 'ssn', entry.kennitala);
                  fetchContactInfo(entry.kennitala, index);
                }}
                className="col-span-2"
              />

              <input
                type="text"
                value={receiver.tel}
                onChange={(e) => updateReceiverField(index, 'tel', e.target.value)}
                onBlur={(e) => updateContact(receiver.ssn, 'tel', e.target.value)}
                placeholder="Símanúmer"
                className="p-2 border rounded"
              />

              <div className="flex gap-2">
                <input
                  type="email"
                  value={receiver.email}
                  onChange={(e) => updateReceiverField(index, 'email', e.target.value)}
                  onBlur={(e) => updateContact(receiver.ssn, 'email', e.target.value)}
                  placeholder="Netfang"
                  className="p-2 border rounded flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeReceiver(index)}
                  disabled={receivers.length === 1}
                  title="Eyða línu"
                  aria-label="Eyða línu"
                  className="px-2 py-1 border rounded text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Eyða
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addReceiver}
            className="text-sm text-[--pm-blue] hover:underline"
          >
            + Bæta við viðtakanda
          </button>
        </>
      )}

      {/* Company mode */}
      {sendMode === 'company' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fyrirtæki/Stofnun</label>
            <input
              list="company-options"
              className="w-full border rounded px-3 py-2"
              placeholder="Veldu fyrirtæki/stofnun..."
              value={companyInput}
              onChange={(e) => {
    const val = e.target.value;
    setCompanyInput(val);

    const match = matchCompanyFromInput(val); // uses your existing matcher
    if (match) {
      // only update if actually different, to avoid redundant fetches
      if (match.SerialNumber !== selectedCompany?.SerialNumber) {
        setSelectedCompany(match);
        setSelectedGroupId(null);
        setGroups([]); // will repopulate via effect
      }
    } else {
      setSelectedCompany(null);
      setSelectedGroupId(null);
      setGroups([]);
    }
  }}
              disabled={companiesLoading}
            />
            <datalist id="company-options">
              {filteredCompanies.map((c) => (
                <option
                  key={c.SerialNumber}
                  value={`${c.CompanyName} (${c.SerialNumber})`}
                  label={c.CompanyName}
                />
              ))}
            </datalist>
            {companiesError && (
              <p className="text-red-600 text-sm mt-1">{companiesError}</p>
            )}
            {selectedCompany && (
              <p className="text-xs text-gray-600 mt-1">
                Valið: {selectedCompany.CompanyName} ({selectedCompany.SerialNumber})
              </p>
            )}
          </div>

          {selectedCompany && (
            <div>
              <label className="block text-sm font-medium mb-1">Hópur</label>
              <select
                className="w-full border rounded px-3 py-2"
                disabled={groupsLoading || groups.length === 0}
                value={selectedGroupId ?? ''}
                onChange={(e) =>
                  setSelectedGroupId(e.target.value ? parseInt(e.target.value, 10) : null)
                }
              >
                <option value="" disabled>
                  Veldu hóp...
                </option>
                {groups.map((g) => (
                  <option key={g.ID} value={g.ID}>
                    {g.Name}
                    {g.Description ? ` — ${g.Description}` : ''}
                  </option>
                ))}
              </select>
              {groupsError && <p className="text-red-600 text-sm mt-1">{groupsError}</p>}
            </div>
          )}
        </div>
      )}

      {/* Shared controls */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        required
        className="block"
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Athugasemdir (valkvætt)"
        className="w-full p-2 border rounded"
      />

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={sendNotification}
          onChange={() => setSendNotification(!sendNotification)}
        />
        <span>Senda tilkynningu…</span>
      </label>

      {sendNotification && (
        <textarea
          value={emailMessage}
          onChange={(e) => setEmailMessage(e.target.value)}
          placeholder="Texti í tölvupósti (valkvætt)"
          className="w-full p-2 border rounded"
        />
      )}

      <div className="text-right">
        <button
          type="submit"
          disabled={submitting}
          className="bg-[--pm-blue] text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60 bg-blue-700"
        >
          Senda
        </button>
      </div>
    </form>
  );
}
