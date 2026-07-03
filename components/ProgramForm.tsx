"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { COUNTRY_COORDS } from "@/lib/countries";
import type { ProgramDTO } from "@/lib/types";

const empty: Partial<ProgramDTO> = {
  region: "PL",
  deadlineStatus: "CONFIRMED",
  countryCode: "PL",
  country: "Polska",
  tags: [],
  latitude: COUNTRY_COORDS.PL.lat,
  longitude: COUNTRY_COORDS.PL.lng,
};

export function ProgramForm({ initial, id }: { initial?: Partial<ProgramDTO>; id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<ProgramDTO>>({ ...empty, ...initial });
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));

  const update = <K extends keyof ProgramDTO>(k: K, v: ProgramDTO[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      ...form,
      tags,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      applyOpen: form.applyOpen ? new Date(form.applyOpen).toISOString() : null,
      applyDeadline: form.applyDeadline ? new Date(form.applyDeadline).toISOString() : null,
    };
    const url = id ? `/api/programs/${id}` : "/api/programs";
    const method = id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      alert("Błąd zapisu: " + (await res.text()));
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  async function onDelete() {
    if (!id) return;
    if (!confirm("Na pewno usunąć?")) return;
    await fetch(`/api/programs/${id}`, { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  function onCountryChange(cc: string) {
    const c = COUNTRY_COORDS[cc as keyof typeof COUNTRY_COORDS];
    if (c) {
      setForm((f) => ({ ...f, countryCode: cc, country: c.name, latitude: c.lat, longitude: c.lng }));
    } else {
      update("countryCode", cc);
    }
  }

  const dateForInput = (iso?: string | null) =>
    iso ? new Date(iso).toISOString().slice(0, 10) : "";

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 bg-white rounded-xl border border-slate-200 p-5">
      <L label="Nazwa"><input required className="inp" value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} /></L>
      <L label="Skrót (opc.)"><input className="inp" value={form.shortName ?? ""} onChange={(e) => update("shortName", e.target.value)} /></L>
      <L label="Organizator"><input required className="inp" value={form.organizer ?? ""} onChange={(e) => update("organizer", e.target.value)} /></L>
      <L label="Region">
        <select className="inp" value={form.region} onChange={(e) => update("region", e.target.value as any)}>
          <option value="PL">PL</option><option value="EU">EU</option><option value="WORLD">WORLD</option>
        </select>
      </L>
      <L label="Kraj (kod ISO-2)">
        <select className="inp" value={form.countryCode} onChange={(e) => onCountryChange(e.target.value)}>
          {Object.entries(COUNTRY_COORDS).map(([cc, c]) => (
            <option key={cc} value={cc}>{cc} – {c.name}</option>
          ))}
        </select>
      </L>
      <L label="Kraj (wyświetlana nazwa)"><input required className="inp" value={form.country ?? ""} onChange={(e) => update("country", e.target.value)} /></L>
      <L label="Latitude"><input required type="number" step="0.0001" className="inp" value={form.latitude ?? 0} onChange={(e) => update("latitude", Number(e.target.value))} /></L>
      <L label="Longitude"><input required type="number" step="0.0001" className="inp" value={form.longitude ?? 0} onChange={(e) => update("longitude", Number(e.target.value))} /></L>
      <L label="Nabór od (opc.)"><input type="date" className="inp" value={dateForInput(form.applyOpen)} onChange={(e) => update("applyOpen", e.target.value || null)} /></L>
      <L label="Deadline"><input type="date" className="inp" value={dateForInput(form.applyDeadline)} onChange={(e) => update("applyDeadline", e.target.value || null)} /></L>
      <L label="Status deadline">
        <select className="inp" value={form.deadlineStatus} onChange={(e) => update("deadlineStatus", e.target.value as any)}>
          <option value="CONFIRMED">CONFIRMED</option><option value="INDICATIVE">INDICATIVE</option><option value="ROLLING">ROLLING</option>
        </select>
      </L>
      <L label="Kwota"><input required className="inp" value={form.amount ?? ""} onChange={(e) => update("amount", e.target.value)} /></L>
      <L label="Waluta (opc.)"><input className="inp" value={form.currency ?? ""} onChange={(e) => update("currency", e.target.value)} /></L>
      <L label="Typ finansowania"><input required className="inp" value={form.fundingType ?? ""} onChange={(e) => update("fundingType", e.target.value)} /></L>
      <L label="Oficjalny URL"><input required type="url" className="inp" value={form.officialUrl ?? ""} onChange={(e) => update("officialUrl", e.target.value)} /></L>
      <L label="Tagi (rozdzielone przecinkami)" full><input className="inp" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} /></L>
      <L label="Dla kogo" full><textarea required className="inp" rows={2} value={form.forWhom ?? ""} onChange={(e) => update("forWhom", e.target.value)} /></L>
      <L label="Wymagania" full><textarea required className="inp" rows={2} value={form.requirements ?? ""} onChange={(e) => update("requirements", e.target.value)} /></L>
      <L label="Opis" full><textarea required className="inp" rows={2} value={form.description ?? ""} onChange={(e) => update("description", e.target.value)} /></L>
      <L label="Dokładne informacje" full><textarea required className="inp" rows={3} value={form.details ?? ""} onChange={(e) => update("details", e.target.value)} /></L>

      <div className="col-span-2 flex items-center gap-2 pt-2">
        <button disabled={saving} className="px-4 py-2 rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? "Zapisywanie…" : "Zapisz"}
        </button>
        {id && (
          <button type="button" onClick={onDelete} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">
            Usuń
          </button>
        )}
      </div>
      <style jsx>{`.inp { width: 100%; border: 1px solid rgb(203 213 225); border-radius: 6px; padding: 6px 8px; font-size: 14px; }`}</style>
    </form>
  );
}

function L({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`text-xs text-slate-500 space-y-1 ${full ? "col-span-2" : ""}`}>
      <div className="uppercase tracking-wide">{label}</div>
      {children}
    </label>
  );
}
