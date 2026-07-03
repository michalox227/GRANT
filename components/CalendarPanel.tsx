"use client";

import { useMemo, useState } from "react";
import type { ProgramDTO } from "@/lib/types";

const MONTHS_PL = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Zakres: sierpień 2026 – sierpień 2027 (13 miesięcy)
function generateRange(): { key: string; label: string; date: Date }[] {
  const out: { key: string; label: string; date: Date }[] = [];
  const start = new Date(2026, 7, 1); // sierpień 2026
  for (let i = 0; i < 13; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    out.push({
      key: monthKey(d),
      label: `${MONTHS_PL[d.getMonth()]} ${d.getFullYear()}`,
      date: d,
    });
  }
  return out;
}

export function CalendarPanel({
  programs,
  selectedMonth,
  onSelectMonth,
}: {
  programs: ProgramDTO[];
  selectedMonth: string | null;
  onSelectMonth: (m: string | null) => void;
}) {
  const range = useMemo(() => generateRange(), []);
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of programs) {
      if (!p.applyDeadline) continue;
      const d = new Date(p.applyDeadline);
      const k = monthKey(d);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [programs]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">Kalendarz deadline'ów</div>
        {selectedMonth && (
          <button
            className="text-xs text-brand-600 underline"
            onClick={() => onSelectMonth(null)}
          >
            wyczyść
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {range.map((m) => {
          const active = selectedMonth === m.key;
          const count = counts.get(m.key) ?? 0;
          return (
            <button
              key={m.key}
              onClick={() => onSelectMonth(active ? null : m.key)}
              className={`text-left px-2 py-1.5 rounded border text-xs transition
                ${active
                  ? "bg-brand-600 text-white border-brand-600"
                  : count > 0
                    ? "bg-white border-slate-300 hover:border-brand-400"
                    : "bg-slate-50 border-slate-200 text-slate-400"}`}
            >
              <div className="font-medium capitalize">{m.label}</div>
              <div className={active ? "text-brand-50" : "text-slate-500"}>
                {count} {count === 1 ? "termin" : "terminów"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function isInMonth(dateISO: string, monthKeyStr: string) {
  const d = new Date(dateISO);
  return monthKey(d) === monthKeyStr;
}
