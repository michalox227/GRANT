import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const programs = await prisma.program.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel admina – programy ({programs.length})</h1>
        <Link
          href="/admin/new"
          className="px-3 py-1.5 bg-brand-600 text-white rounded text-sm hover:bg-brand-700"
        >
          + Dodaj program
        </Link>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-2">Nazwa</th>
              <th className="p-2">Region</th>
              <th className="p-2">Kraj</th>
              <th className="p-2">Deadline</th>
              <th className="p-2">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2">{p.region}</td>
                <td className="p-2">{p.country}</td>
                <td className="p-2">{p.applyDeadline ? p.applyDeadline.toLocaleDateString("pl-PL") : "—"}</td>
                <td className="p-2 text-xs">{p.deadlineStatus}</td>
                <td className="p-2 text-right">
                  <Link href={`/admin/${p.id}`} className="text-brand-700 hover:underline">edytuj</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
