import { prisma } from "@/lib/prisma";
import { AtlasView } from "@/components/AtlasView";
import type { ProgramDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const programs = await prisma.program.findMany({
    orderBy: [{ applyDeadline: "asc" }],
  });
  const dto: ProgramDTO[] = programs.map((p) => ({
    ...p,
    applyOpen: p.applyOpen?.toISOString() ?? null,
    applyDeadline: p.applyDeadline?.toISOString() ?? null,
    verifiedAt: p.verifiedAt.toISOString(),
  }));
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl text-white p-4">
          <h1 className="text-xl md:text-2xl font-bold">
            Grant Atlas – bezzwrotne dotacje dla startupów na świecie
          </h1>
          <p className="text-sm text-brand-50 mt-1">
            Kliknij kraj na mapie, wybierz miesiąc w kalendarzu lub użyj filtrów po lewej.
            Zakres danych: 1 sierpnia 2026 – 1 sierpnia 2027.
          </p>
        </div>
      </div>
      <AtlasView initialPrograms={dto} />
    </>
  );
}
