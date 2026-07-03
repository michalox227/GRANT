"use client";

import type { ProgramDTO } from "@/lib/types";

const STATUS_LABEL = {
  CONFIRMED: { text: "Potwierdzony", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  INDICATIVE: { text: "Planowany (do potwierdzenia)", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  ROLLING: { text: "Ciągły nabór", cls: "bg-sky-100 text-sky-800 border-sky-300" },
};

const REGION_LABEL = { PL: "Polska", EU: "Europa/UE", WORLD: "Świat" };

export function ProgramDetail({
  program,
  onClose,
}: {
  program: ProgramDTO | null;
  onClose: () => void;
}) {
  if (!program) {
    return (
      <div className="p-6 text-sm text-slate-500">
        <div className="text-2xl mb-2">👈</div>
        Wybierz punkt na mapie, listę programów lub kliknij miesiąc w kalendarzu, aby zobaczyć szczegóły.
      </div>
    );
  }
  const s = STATUS_LABEL[program.deadlineStatus];
  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">{REGION_LABEL[program.region]} · {program.country}</div>
          <h2 className="text-xl font-bold leading-tight">{program.name}</h2>
          <div className="text-sm text-slate-600 mt-1">{program.organizer}</div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
          aria-label="zamknij"
        >
          ×
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${s.cls}`}>{s.text}</span>
        {program.tags.map((t) => (
          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {t}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {program.applyOpen && (
          <Field label="Nabór od">
            {new Date(program.applyOpen).toLocaleDateString("pl-PL")}
          </Field>
        )}
        {program.applyDeadline && (
          <Field label="Deadline">
            <span className="font-semibold">
              {new Date(program.applyDeadline).toLocaleDateString("pl-PL")}
            </span>
          </Field>
        )}
        <Field label="Kwota">{program.amount}</Field>
        <Field label="Typ finansowania">{program.fundingType}</Field>
      </div>

      <Section title="Dla kogo">{program.forWhom}</Section>
      <Section title="Wymagania">{program.requirements}</Section>
      <Section title="Opis">{program.description}</Section>
      <Section title="Dokładne informacje">{program.details}</Section>

      <div>
        <a
          href={program.officialUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 text-sm"
        >
          Przejdź na oficjalną stronę ↗
        </a>
      </div>
      <div className="text-xs text-slate-400">
        Zweryfikowano: {new Date(program.verifiedAt).toLocaleDateString("pl-PL")}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{title}</div>
      <div className="text-sm text-slate-800 whitespace-pre-line">{children}</div>
    </div>
  );
}
