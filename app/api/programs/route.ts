import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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

export async function GET() {
  const programs = await prisma.program.findMany({
    orderBy: [{ applyDeadline: "asc" }],
  });
  return NextResponse.json(programs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const data = parsed.data;
  const created = await prisma.program.create({
    data: {
      ...data,
      applyOpen: data.applyOpen ? new Date(data.applyOpen) : null,
      applyDeadline: data.applyDeadline ? new Date(data.applyDeadline) : null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
