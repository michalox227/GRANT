import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import fallbackPrograms from "@/lib/fallback-programs.json";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().min(1),
  shortName: z.string().optional().nullable(),
  organizer: z.string().min(1),
  country: z.string().min(1),
  countryCode: z.string().min(2).max(2),
  region: z.enum(["PL", "EU", "WORLD"]),
  latitude: z.number(),
  longitude: z.number(),
  applyOpen: z.string().datetime().optional().nullable(),
  applyDeadline: z.string().datetime().optional().nullable(),
  deadlineStatus: z.enum(["CONFIRMED", "INDICATIVE", "ROLLING"]),
  amount: z.string(),
  currency: z.string().optional().nullable(),
  fundingType: z.string(),
  forWhom: z.string(),
  requirements: z.string(),
  description: z.string(),
  details: z.string(),
  officialUrl: z.string().url(),
  tags: z.array(z.string()),
});

// GET zwraca dane w kształcie używanym przez front (SPA).
// Gdy baza jest podpięta — mapuje rekordy Prisma; bez bazy — pełny fallback JSON (~150 programów).
export async function GET() {
  try {
    const programs = await prisma.program.findMany({
      orderBy: [{ applyDeadline: "asc" }],
    });
    if (programs.length === 0) return NextResponse.json(fallbackPrograms);
    const mapped = programs.map((p) => ({
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      organizer: p.organizer,
      country: p.country,
      cc: p.countryCode,
      region: p.region,
      lat: p.latitude,
      lng: p.longitude,
      applyOpen: p.applyOpen?.toISOString() ?? null,
      applyDeadline: p.applyDeadline?.toISOString() ?? null,
      status: p.deadlineStatus,
      amount: p.amount,
      currency: p.currency,
      fundingType: p.fundingType,
      forWhom: p.forWhom,
      requirements: p.requirements,
      description: p.description,
      details: p.details,
      url: p.officialUrl,
      tags: p.tags,
    }));
    return NextResponse.json(mapped);
  } catch {
    // Baza niedostępna (np. brak DATABASE_URL na hostingu) — serwuj wbudowany zestaw danych
    return NextResponse.json(fallbackPrograms);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const data = parsed.data;
  try {
    const created = await prisma.program.create({
      data: {
        ...data,
        applyOpen: data.applyOpen ? new Date(data.applyOpen) : null,
        applyDeadline: data.applyDeadline ? new Date(data.applyDeadline) : null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Baza danych niepodłączona — ustaw DATABASE_URL, aby edytować programy." },
      { status: 503 }
    );
  }
}
