// waitinglist/waitinglistclient.tsx
'use client';

type Patient = {
  name: string;
  kennitala: string;
  phone: string;
  email: string;
  book_before: string;
  umonnunaradiliID: string;
  umonnunaradili: string;
  _originalIndex?: number;
};

type ManualEntry = {
  id: string;
  name: string;
  email: string;
  phone: string;
};
import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Heading from "@tiptap/extension-heading";
import ListItem from "@tiptap/extension-list-item";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Toolbar from "@/components/Toolbar";
import type { ChangeEvent } from "react";
import Head from "next/head";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
console.log('API_BASE' + API_BASE);

export default function WaitingListPage() {
  const [method, setMethod] = useState("sms");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [grouped, setGrouped] = useState<Record<string, Patient[]>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<Record<string, { key: string; direction: string }>>({});
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([
    { id: crypto.randomUUID(), name: '', email: '', phone: '' }
  ]);
  const [selectedManual, setSelectedManual] = useState<Record<string, boolean>>({});

  const personaliseMessage = (template: string, patient: Patient) => {
    return template
      .replace(/%nafn%/g, patient.name)
      .replace(/%medferdaradili%/g, patient.umonnunaradili);
  };

  const stripHtml = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const sendMessages = async () => {
    const allPatients = Object.entries(grouped).flatMap(([month, patients]) =>
      patients.map((p, i) => ({ ...p, id: `${month}_${p.kennitala}_${i}` }))
    );
    const selectedPatients = allPatients.filter((p) => selected[p.id]);

    // Include selected manual entries
    const selectedManualEntries = manualEntries.filter(
      (entry) => selectedManual[entry.id] && (entry.name || entry.email || entry.phone)
    );

    if (method === "sms") {
      const payload = [
        ...selectedPatients.map((p) => ({
          recipient: p.phone.length === 7 ? `+354${p.phone}` : p.phone,
          body: personaliseMessage(message, p),
        })),
        ...selectedManualEntries.map((entry) => ({
          recipient: entry.phone.length === 7 ? `+354${entry.phone}` : entry.phone,
          body: message.replace(/%nafn%/g, entry.name).replace(/%medferdaradili%/g, ''),
        })),
      ];

      await fetch(`${API_BASE}/messaging/SendSMS`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
    } else if (method === "email") {
      for (const p of selectedPatients) {
        const personalised = personaliseMessage(message, p);

        const emailPayload = {
          sender: {
            emailAddress: {
              name: "Per mentis",
              address: "noreply@permentis.is",
            },
          },
          to: [
            {
              emailAddress: {
                address: p.email,
                name: p.name,
              },
            },
          ],
          subject: subject,
          contentType: "HTML",
          body: personalised,
        };

        await fetch(`${API_BASE}/messaging/SendEmail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload),
        });
      }

      // Send to manual entries
      for (const entry of selectedManualEntries) {
        const personalised = message.replace(/%nafn%/g, entry.name).replace(/%medferdaradili%/g, '');

        const emailPayload = {
          sender: {
            emailAddress: {
              name: "Per mentis",
              address: "noreply@permentis.is",
            },
          },
          to: [
            {
              emailAddress: {
                address: entry.email,
                name: entry.name,
              },
            },
          ],
          subject: subject,
          contentType: "HTML",
          body: personalised,
        };

        await fetch(`${API_BASE}/messaging/SendEmail`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload),
        });
      }
    }

    alert("Messages sent!");
  };

  const tiptapEditor = useEditor({
    extensions: [
      StarterKit,
      Bold,
      Italic,
      Underline,
      Heading,
      ListItem,
      BulletList,
      OrderedList,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      FontFamily,
      Image,
      Placeholder.configure({ placeholder: "Texti tölvupósts" }),
      Link,
    ],
    content: "",
    editorProps: {
      attributes: {
        style: "min-height: 300px; padding: 10px; border: 1px solid #ccc; outline: none; border-radius: 4px;",
      },
    },
    onUpdate: ({ editor }) => {
      if (method === "email") {
        setMessage(editor.getHTML());
      }
    },
    immediatelyRender: false,
  }, [method]);

  useEffect(() => {
    if (method === "email" && tiptapEditor && !tiptapEditor.isDestroyed) {
      tiptapEditor.commands.setContent(`<p>${message}</p>`);
    }
  }, [method, tiptapEditor]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/messaging/PMOAminningarEftirManudum`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      alert("Villa við upphleðslu skráar");
      return;
    }

    const data = await res.json();
    const transformed: Record<string, Patient[]> = {};
    for (const [month, patients] of Object.entries(data) as [string, any[]][]) {
      transformed[month] = patients.map((p, i) => ({
        name: p.fulltnafn,
        kennitala: p.kennitala,
        phone: p.gsm_numer,
        email: p.netfang,
        book_before:
          typeof p.boka_fyrir === "string"
            ? p.boka_fyrir
            : new Date(p.boka_fyrir).toISOString().split("T")[0],
        umonnunaradiliID: p.umonnunaradiliID,
        umonnunaradili: p.umonnunaradili,
        _originalIndex: i,
      }));
    }
    setGrouped(transformed);
  };

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = (month: string, patients: Patient[]) => {
    const allIds = patients.map((p) => `${month}_${p.kennitala}_${p._originalIndex}`);
    const allSelected = allIds.every((id) => selected[id]);
    const updates: Record<string, boolean> = {};
    allIds.forEach((id) => {
      updates[id] = !allSelected;
    });
    setSelected((prev) => ({ ...prev, ...updates }));
  };

  const compareValues = (a: string | number, b: string | number, direction: string) => {
    const aStr = typeof a === "number" ? a.toString() : a;
    const bStr = typeof b === "number" ? b.toString() : b;
    return aStr.localeCompare(bStr) * (direction === "asc" ? 1 : -1);
  };

  const addManualEntry = () => {
    setManualEntries((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', email: '', phone: '' }
    ]);
  };

  const updateManualEntry = (id: string, field: keyof ManualEntry, value: string) => {
    setManualEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
  };

  const removeManualEntry = (id: string) => {
    setManualEntries((prev) => prev.filter((entry) => entry.id !== id));
    setSelectedManual((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const toggleManualEntry = (id: string) => {
    setSelectedManual((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllManualEntries = () => {
    const filledEntries = manualEntries.filter(
      (entry) => entry.name || entry.email || entry.phone
    );
    const allSelected = filledEntries.every((entry) => selectedManual[entry.id]);
    const updates: Record<string, boolean> = {};
    filledEntries.forEach((entry) => {
      updates[entry.id] = !allSelected;
    });
    setSelectedManual((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="p-4 space-y-4">


      <input type="file" className="file:px-4 file:py-2 file:rounded file:bg-[#C2C9C7] file:text-white hover:file:bg-[#4A5459]" onChange={handleFileChange} />

      {/* Manual Entry Section */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2">Handvirk skráning</h2>
        <table className="w-full border text-left">
          <thead>
            <tr className="bg-[#85929A] text-white">
              <th className="px-2 py-2">
                <input
                  type="checkbox"
                  onChange={toggleAllManualEntries}
                  checked={
                    manualEntries.filter((e) => e.name || e.email || e.phone).length > 0 &&
                    manualEntries
                      .filter((e) => e.name || e.email || e.phone)
                      .every((e) => selectedManual[e.id])
                  }
                />
              </th>
              <th className="px-4 py-2">Nafn</th>
              <th className="px-4 py-2">Netfang</th>
              <th className="px-4 py-2">Sími</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {manualEntries.map((entry, i) => (
              <tr key={entry.id} className={i % 2 === 0 ? "bg-[#EFF3F5]" : "bg-[#C2C9C7]"}>
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selectedManual[entry.id] || false}
                    onChange={() => toggleManualEntry(entry.id)}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="text"
                    value={entry.name}
                    onChange={(e) => updateManualEntry(entry.id, 'name', e.target.value)}
                    placeholder="Nafn"
                    className="w-full border rounded px-2 py-1"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="email"
                    value={entry.email}
                    onChange={(e) => updateManualEntry(entry.id, 'email', e.target.value)}
                    placeholder="Netfang"
                    className="w-full border rounded px-2 py-1"
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    type="tel"
                    value={entry.phone}
                    onChange={(e) => updateManualEntry(entry.id, 'phone', e.target.value)}
                    placeholder="Sími"
                    className="w-full border rounded px-2 py-1"
                  />
                </td>
                <td className="px-2 py-1">
                  {manualEntries.length > 1 && (
                    <button
                      onClick={() => removeManualEntry(entry.id)}
                      className="text-red-600 hover:text-red-800 px-2"
                      title="Eyða"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={addManualEntry}
          className="mt-2 bg-[#C2C9C7] text-white px-4 py-2 rounded hover:bg-[#4A5459]"
        >
          + Bæta við röð
        </button>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="method"
            value="sms"
            checked={method === "sms"}
            onChange={() => {
              setMethod("sms");
              setMessage(stripHtml(message));
            }}
          />
          SMS
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="method"
            value="email"
            checked={method === "email"}
            onChange={() => setMethod("email")}
          />
          Tölvupóstur
        </label>
      </div>

      {method === "sms" ? (
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="SMS skilaboð"
          className="w-full border rounded p-2 min-h-[150px]"
        />
      ) : (
        <>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Efni tölvupósts"
            className="w-full border rounded p-2"
          />
          <Toolbar editor={tiptapEditor} />
          <EditorContent editor={tiptapEditor} />
        </>
      )}

      <div>
        <button onClick={sendMessages} className="bg-[#C2C9C7] text-white px-4 py-2 rounded hover:bg-[#4A5459]">
          Senda
        </button>
      </div>
      <div>
        Frösunum %nafn% og %medferdaradili% verður skipt út fyrir nafn sjúklings og nafn meðferðaraðila við sendingu.
      </div>

      {Object.entries(grouped).map(([month, patients]) => {
        const sorted = sortConfig[month]
          ? [...patients].sort((a, b) => {
              const { key, direction } = sortConfig[month];
              return compareValues(a[key as keyof Patient] ?? "", b[key as keyof Patient] ?? "", direction);
            })
          : patients;

        return (
          <div key={month}>
            <h2 className="text-xl font-bold cursor-pointer mt-6">{month}</h2>
            <table className="w-full border mt-2 text-left">
              <thead>
                <tr className="bg-[#85929A] text-white">
                  <th className="px-2 py-2">
                    <input
                      type="checkbox"
                      onChange={() => toggleAll(month, sorted)}
                      checked={sorted.every((p) => selected[`${month}_${p.kennitala}_${p._originalIndex}`])}
                    />
                  </th>
                  {["name", "kennitala", "phone", "email", "book_before", "umonnunaradili"].map((key) => (
                    <th
                      key={key}
                      className="cursor-pointer hover:underline px-4 py-2"
                      onClick={() =>
                        setSortConfig((prev) => ({
                          ...prev,
                          [month]: {
                            key,
                            direction:
                              prev[month]?.key === key && prev[month]?.direction === "asc"
                                ? "desc"
                                : "asc",
                          },
                        }))
                      }
                    >
                      {key === "name"
                        ? "Nafn"
                        : key === "kennitala"
                        ? "Kennitala"
                        : key === "phone"
                        ? "Sími"
                        : key === "email"
                        ? "Netfang"
                        : key === "book_before"
                        ? "Bóka fyrir"
                        : "Meðferðaraðili"}
                      {sortConfig[month]?.key === key && (sortConfig[month]?.direction === "asc" ? " ↑" : " ↓")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => {
                  const id = `${month}_${p.kennitala}_${p._originalIndex}`;
                  return (
                    <tr key={id} className={i % 2 === 0 ? "bg-[#EFF3F5]" : "bg-[#C2C9C7]"}>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selected[id] || false}
                          onChange={() => toggle(id)}
                        />
                      </td>
                      <td>{p.name}</td>
                      <td>{p.kennitala}</td>
                      <td>{p.phone}</td>
                      <td>{p.email}</td>
                      <td>{p.book_before}</td>
                      <td>{p.umonnunaradili}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
