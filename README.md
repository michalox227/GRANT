# Grant Atlas

Interaktywne narzędzie do przeglądania **bezzwrotnych grantów i dotacji dla startupów** — Polska, UE, świat. Zakres danych: **1 sierpnia 2026 – 1 sierpnia 2027**.

Widok główny to mapa świata (Leaflet) + kalendarz miesięcy + filtry (region, kraj, tag, wyszukiwanie, tylko potwierdzone). Kliknięcie punktu na mapie lub pozycji na liście otwiera panel szczegółów: kwota, dla kogo, wymagania, opis, dokładne informacje, link do oficjalnej strony.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Prisma** + **PostgreSQL**
- **Leaflet** / react-leaflet (OpenStreetMap tiles)
- **Tailwind CSS**
- **Zod** (walidacja API)
- **Basic Auth** middleware dla `/admin` (bez zewnętrznej biblioteki)

## Uruchomienie lokalne

```bash
# 1. Zależności
npm install

# 2. Baza (Docker)
docker compose up -d

# 3. .env
cp .env.example .env
# ustaw ADMIN_USER/ADMIN_PASS

# 4. Schema + seed
npm run db:push
npm run db:seed

# 5. Dev
npm run dev
# http://localhost:3000
# panel:      http://localhost:3000/admin  (Basic Auth: ADMIN_USER/ADMIN_PASS)
# agregatory: http://localhost:3000/aggregators
```

## Model danych (`prisma/schema.prisma`)

**Program** — pojedynczy nabór lub cut-off:
- `name`, `shortName`, `organizer`
- `country`, `countryCode` (ISO-2), `region` (`PL` | `EU` | `WORLD`)
- `latitude`, `longitude` (pin na mapie)
- `applyOpen`, `applyDeadline`
- `deadlineStatus` — **CONFIRMED** (potwierdzony ze źródła), **INDICATIVE** (planowany wg harmonogramu; do potwierdzenia), **ROLLING** (ciągły nabór)
- `amount`, `currency`, `fundingType`
- `forWhom`, `requirements`, `description`, `details`
- `officialUrl`, `tags[]`
- `verifiedAt` (data ostatniej weryfikacji)

**Aggregator** — zewnętrzne serwisy zbierające programy (podstrona `/aggregators`).

## Dane w seed

Aktualnie ~45 zweryfikowanych programów (PL: PARP/FENG/NCBR/BGK/Platformy Startowe; EU: EIC Accelerator, EIC Pathfinder, Eurostars, Digital Europe, EIT, EXIST, Bourse French Tech, Enterprise Ireland, Vinnova, EAS, Innovate UK; ŚWIAT: NIH/NSF/NASA/DoD/USDA SBIR, IIA Tnufa, Startup SG Founder, EDG, NRC IRAP, Industry Growth Program AU, MBRIF UAE, NEDO, TIPS Korea, Callaghan Innovation) + 18 agregatorów.

**Ważne o statusach:**
- `CONFIRMED` — konkretna data ogłoszona przez organizatora (potwierdzone np. NIH 5.09.2026, EIC 4.11.2026, EXIST 3.08.2026, Eurostars 10.09.2026, Innovate UK 18.09.2026, Digital Europe 1.10.2026).
- `INDICATIVE` — data z opublikowanego harmonogramu / typowego cyklu; **wymaga weryfikacji** na oficjalnej stronie przed składaniem wniosku.
- `ROLLING` — nabór ciągły (np. IRAP Kanada, Bourse French Tech, Startup SG Founder, Tnufa, EDG SG, EAS Estonia).

**Rozszerzanie bazy** — przez panel `/admin`. Kolejne planowane grupy do dodania: RPO 16 województw PL (regionalne dotacje), więcej programów krajowych (Włochy CDP, Hiszpania ENISA, Portugalia IAPMEI, Belgia VLAIO), więcej stanów US, LatAm, RPA.

## Autoryzacja panelu admin

Prosty Basic Auth przez `middleware.ts`. Zmienne:
- `ADMIN_USER` (domyślnie `admin`)
- `ADMIN_PASS` (**zmień w produkcji**)

Endpointy chronione: `/admin/**`, `POST/PUT/DELETE /api/programs/**`. `GET /api/programs` jest publiczny.

## Deploy

- Aplikacja jest kompatybilna z Vercel (uwaga: uruchom osobno Postgres — Supabase, Neon, RDS).
- W produkcji rozważ zamianę Basic Auth na NextAuth (Google, GitHub) w `middleware.ts`.

## Źródła (weryfikacja programów, lipiec 2026)

- [PARP – harmonogram naborów](https://www.parp.gov.pl/harmonogram-naborow)
- [FENG](https://feng.parp.gov.pl/)
- [NCBR – harmonogram konkursów 2026](https://www.gov.pl/web/ncbr/harmonogram-konkursow-2026)
- [EIC Accelerator](https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en)
- [Eureka Eurostars](https://www.eurekanetwork.org/programmes-and-calls/eurostars/)
- [Digital Europe Programme](https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/programmes/digital)
- [EXIST](https://www.exist.de/)
- [Bpifrance – Bourse French Tech](https://www.bpifrance.fr/catalogue-offres/bourse-french-tech)
- [Innovate UK / UKRI](https://apply-for-innovation-funding.service.gov.uk/competition/search)
- [Israel Innovation Authority – Tnufa](https://innovationisrael.org.il/en/programs/ideation-tnufa-incentive-program/)
- [Startup SG Founder](https://www.startupsg.gov.sg/programmes/4894/startup-sg-founder)
- [NRC IRAP](https://nrc.canada.ca/en/support-technology-innovation)
- [business.gov.au – Industry Growth Program](https://business.gov.au/grants-and-programs/industry-growth-program)
- [NIH SBIR/STTR](https://seed.nih.gov/small-business-funding/find-funding/sbir-sttr-funding-opportunities)
- [NSF SBIR](https://seedfund.nsf.gov/solicitations/)
- [NASA SBIR/STTR PY2026](https://www.nasa.gov/sbir_sttr/nasa-sbir-sttr-program-program-year-2026-information-hub/)
