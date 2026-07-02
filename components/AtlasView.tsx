"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ProgramDTO } from "@/lib/types";
import { Filters, type FilterState } from "./Filters";
import { CalendarPanel, isInMonth } from "./CalendarPanel";
import { ProgramDetail } from "./ProgramDetail";

const MapClient = dynamic(() => import("./MapClient"), { ssr: false });

export function AtlasView({ initialPrograms }: { initialPrograms: ProgramDTO[] }) {
  const [filters, setFilters] = useState<FilterState>({
    region: "ALL",
    country: "ALL",
    query: "",
    tag: "ALL",
    onlyConfirmed: false,
  });
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProgramDTO | null>(null);

  const filtered = useMemo(() => {
    return initialPrograms.filter((p) => {
      if (filters.region !== "ALL" && p.region !== filters.region) return false;
      if (filters.country !== "ALL" && p.countryCode !== filters.country) return false;
      if (filters.tag !== "ALL" && !p.tags.includes(filters.tag)) return false;
      if (filters.onlyConfirmed && p.deadlineStatus !== "CONFIRMED") return false;
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const hay = [p.name, p.shortName, p.organizer, p.country, p.description, p.tags.join(" ")]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (selectedMonth) {
        if (!p.applyDeadline) return false;
        if (!isInMonth(p.applyDeadline, selectedMonth)) return false;
      }
      return true;
    });
  }, [initialPrograms, filters, selectedMonth]);

  const focus = selected ? ([selected.latitude, selected.longitude] as [number, number]) : null;

  return (
    <div className="max-w-7xl mx-auto p-4 grid grid-cols-12 gap-4">
      <aside className="col-span-12 md:col-span-3 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <Filters state={filters} onChange={setFilters} programs={initialPrograms} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <CalendarPanel
            programs={initialPrograms}
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
          />
        </div>
      </aside>

      <section className="col-span-12 md:col-span-6 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 h-[520px]">
          <MapClient
            programs={filtered}
            onSelect={setSelected}
            selectedId={selected?.id}
            focus={focus}
          />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-2">
            Wyników: <span className="font-semibold text-slate-700">{filtered.length}</span>
            {selectedMonth && (
              <span className="ml-2">
                (filtr miesiąca aktywny; wyczyść w kalendarzu)
              </span>
            )}
          </div>
          <ul className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  className={`w-full text-left px-2 py-2 hover:bg-slate-50 flex items-center gap-3 ${
                    selected?.id === p.id ? "bg-brand-50" : ""
                  }`}
                  onClick={() => setSelected(p)}
                >
                  <span
                    className={`marker-pin ${p.region.toLowerCase()}`}
                    style={{ minWidth: 22, height: 22, fontSize: 10 }}
                  >
                    {p.countryCode}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium text-sm">{p.name}</span>
                    <span className="block text-xs text-slate-500">{p.country} · {p.organizer}</span>
                  </span>
                  {p.applyDeadline && (
                    <span className="text-xs text-slate-600 whitespace-nowrap">
                      {new Date(p.applyDeadline).toLocaleDateString("pl-PL")}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="p-4 text-sm text-slate-500">
                Brak wyników – rozluźnij filtry.
              </li>
            )}
          </ul>
        </div>
      </section>

      <aside className="col-span-12 md:col-span-3 bg-white rounded-xl border border-slate-200 h-[770px]">
        <ProgramDetail program={selected} onClose={() => setSelected(null)} />
      </aside>
    </div>
  );
}
