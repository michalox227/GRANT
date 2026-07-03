import { prisma } from "@/lib/prisma";
import { ProgramForm } from "@/components/ProgramForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await prisma.program.findUnique({ where: { id } });
  if (!p) notFound();
  const initial = {
    ...p,
    applyOpen: p.applyOpen?.toISOString() ?? null,
    applyDeadline: p.applyDeadline?.toISOString() ?? null,
    verifiedAt: p.verifiedAt.toISOString(),
  };
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Edytuj: {p.name}</h1>
      <ProgramForm initial={initial as any} id={id} />
    </div>
  );
}
