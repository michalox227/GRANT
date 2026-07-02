import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const REGION_LABEL = { PL: "Polska", EU: "Europa/UE", WORLD: "Świat" } as const;

export default async function AggregatorsPage() {
  const aggs = await prisma.aggregator.findMany({ orderBy: [{ region: "asc" }, { name: "asc" }] });
  const grouped: Record<"PL" | "EU" | "WORLD", typeof aggs> = { PL: [], EU: [], WORLD: [] };
  for (const a of aggs) grouped[a.region].push(a);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agregatory grantów i dotacji</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Zewnętrzne serwisy, które zbierają programy grantowe — dobre miejsca do bieżącego
          monitoringu poza tym narzędziem.
        </p>
      </div>
      {(Object.keys(grouped) as Array<"PL" | "EU" | "WORLD">).map((r) => (
        <section key={r} className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold mb-3">{REGION_LABEL[r]}</h2>
          <ul className="grid md:grid-cols-2 gap-3">
            {grouped[r].map((a) => (
              <li key={a.id} className="border border-slate-200 rounded-lg p-3 hover:border-brand-400 transition">
                <a href={a.url} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
                  {a.name} ↗
                </a>
                <div className="text-xs text-slate-500 mt-0.5">{a.country}</div>
                <p className="text-sm text-slate-700 mt-2">{a.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
