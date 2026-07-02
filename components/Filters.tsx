"use client";

import type { ProgramDTO } from "@/lib/types";

export type FilterState = {
  region: "ALL" | "PL" | "EU" | "WORLD";
  country: string; // "ALL" lub countryCode
  query: string;
  tag: string; // "ALL" lub tag
  onlyConfirmed: boolean;
};

export function Filters({
  state,
  onChange,
  programs,
}: {
  state: FilterState;
  onChange: (s: FilterState) => void;
  programs: ProgramDTO[];
}) {
  const countries = Array.from(
    new Map(programs.map((p) => [p.countryCode, p.country])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));
  const tags = Array.from(new Set(programs.flatMap((p) => p.tags))).sort();

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Region</label>
        <div className="flex flex-wrap gap-1">
          {(["ALL", "PL", "EU", "WORLD"] as const).map((r) => (
            <button
              key={r}
              onClick={() => onChange({ ...state, region: r })}
              className={`px-3 py-1 text-xs rounded-full border ${
                state.region === r
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-slate-700 border-slate-300 hover:border-brand-400"
              }`}
            >
              {r === "ALL" ? "Wszystkie" : r === "PL" ? "🇵🇱 Polska" : r === "EU" ? "🇪🇺 UE" : "🌍 Świat"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Kraj</label>
        <select
          value={state.country}
          onChange={(e) => onChange({ ...state, country: e.target.value })}
          className="w-full text-sm border border-slate-300 rounded px-2 py-1"
        >
          <option value="ALL">Wszystkie</option>
          {countries.map(([cc, name]) => (
            <option key={cc} value={cc}>{name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Tag / branża</label>
        <select
          value={state.tag}
          onChange={(e) => onChange({ ...state, tag: e.target.value })}
          className="w-full text-sm border border-slate-300 rounded px-2 py-1"
        >
          <option value="ALL">Wszystkie</option>
          {tags.map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Szukaj</label>
        <input
          value={state.query}
          onChange={(e) => onChange({ ...state, query: e.target.value })}
          placeholder="np. EIC, PARP, deeptech…"
          className="w-full text-sm border border-slate-300 rounded px-2 py-1"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.onlyConfirmed}
          onChange={(e) => onChange({ ...state, onlyConfirmed: e.target.checked })}
        />
        Tylko potwierdzone terminy
      </label>
    </div>
  );
}
