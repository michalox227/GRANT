import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Grant Atlas – mapa bezzwrotnych dotacji dla startupów",
  description:
    "Interaktywna mapa i kalendarz bezzwrotnych grantów i dotacji dla startupów – Polska, UE, świat.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-bold text-lg tracking-tight">
              Grant<span className="text-brand-600">Atlas</span>
            </Link>
            <nav className="flex gap-4 text-sm text-slate-700">
              <Link href="/" className="hover:text-brand-600">Mapa i kalendarz</Link>
              <Link href="/aggregators" className="hover:text-brand-600">Agregatory</Link>
              <Link href="/admin" className="hover:text-brand-600">Admin</Link>
            </nav>
            <div className="ml-auto text-xs text-slate-500">
              zakres danych: VIII 2026 – VIII 2027
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 py-3">
            Dane pochodzą z oficjalnych źródeł (PARP, NCBR, EIC, sbir.gov itd.).
            Programy oznaczone <span className="text-amber-600 font-medium">INDICATIVE</span> mają
            terminy planowane – zawsze weryfikuj datę na stronie organizatora przed składaniem
            wniosku.
          </div>
        </footer>
      </body>
    </html>
  );
}
