import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.program.findUnique({ where: { id } });
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(p);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = await prisma.program.update({
    where: { id },
    data: {
      ...body,
      applyOpen: body.applyOpen ? new Date(body.applyOpen) : null,
      applyDeadline: body.applyDeadline ? new Date(body.applyDeadline) : null,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.program.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
