import { PrismaClient } from "@prisma/client";

// Bez DATABASE_URL (np. hosting bez bazy) konstruktor Prisma rzuca błąd przy imporcie.
// Podstawiamy nieosiągalny adres — zapytania będą rzucać w runtime, a API ma fallback JSON.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["warn", "error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
