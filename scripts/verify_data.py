#!/usr/bin/env python3
"""Weryfikator danych Grant Atlas.

Sprawdza jakość danych w lib/fallback-programs.json:
  1. dostępność oficjalnych stron programów (HTTP status),
  2. programy z deadline'em w przeszłości (do usunięcia/aktualizacji),
  3. duplikaty URL-i i brakujące pola wymagane.

Użycie:
    python3 scripts/verify_data.py            # pełny raport
    python3 scripts/verify_data.py --no-http  # bez odpytywania stron (szybkie)

Wynik zapisywany też do scripts/verify_report.json (dla CI / automatyzacji).
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime as dt
import json
import pathlib
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "lib" / "fallback-programs.json"
REPORT = ROOT / "scripts" / "verify_report.json"

REQUIRED_FIELDS = [
    "name", "organizer", "country", "cc", "region", "lat", "lng",
    "status", "amount", "fundingType", "forWhom", "requirements",
    "description", "details", "url", "tags",
]

HEADERS = {"User-Agent": "GrantAtlas-verify/1.0 (+https://github.com/michalox227/GRANT)"}


def check_url(url: str, timeout: int = 12) -> tuple[str, int | str]:
    req = urllib.request.Request(url, headers=HEADERS, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return url, res.status
    except urllib.error.HTTPError as e:
        if e.code in (403, 405):  # niektóre serwery blokują HEAD — spróbuj GET
            try:
                req = urllib.request.Request(url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=timeout) as res:
                    return url, res.status
            except Exception as e2:  # noqa: BLE001
                return url, str(e2)
        return url, e.code
    except Exception as e:  # noqa: BLE001
        return url, str(e)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-http", action="store_true", help="pomiń sprawdzanie stron")
    args = ap.parse_args()

    programs = json.loads(DATA.read_text())
    today = dt.date.today()
    report: dict = {"checked_at": today.isoformat(), "total": len(programs)}

    # 1. brakujące pola
    missing = [
        {"name": p.get("name", "?"), "missing": [f for f in REQUIRED_FIELDS if not p.get(f)]}
        for p in programs
        if any(not p.get(f) for f in REQUIRED_FIELDS)
    ]
    report["missing_fields"] = missing

    # 2. przeterminowane deadline'y
    expired = []
    for p in programs:
        d = p.get("applyDeadline")
        if d and dt.date.fromisoformat(d[:10]) < today:
            expired.append({"name": p["name"], "deadline": d[:10], "status": p.get("status")})
    report["expired_deadlines"] = expired

    # 3. duplikaty URL
    seen: dict[str, str] = {}
    dups = []
    for p in programs:
        u = p.get("url", "")
        if u in seen:
            dups.append({"url": u, "programs": [seen[u], p["name"]]})
        seen[u] = p["name"]
    report["duplicate_urls"] = dups

    # 4. HTTP status oficjalnych stron
    if not args.no_http:
        urls = sorted({p["url"] for p in programs if p.get("url")})
        broken = []
        with cf.ThreadPoolExecutor(max_workers=16) as ex:
            for url, status in ex.map(check_url, urls):
                if not (isinstance(status, int) and status < 400):
                    broken.append({"url": url, "status": status})
        report["broken_urls"] = broken

    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False))

    print(f"Programów: {report['total']}")
    print(f"Braki pól: {len(missing)}")
    print(f"Przeterminowane deadline'y: {len(expired)}")
    for e in expired[:10]:
        print(f"  - {e['name']} ({e['deadline']})")
    print(f"Duplikaty URL: {len(dups)}")
    if not args.no_http:
        print(f"Niedziałające strony: {len(report['broken_urls'])}")
        for b in report["broken_urls"][:10]:
            print(f"  - {b['url']} -> {b['status']}")
    print(f"\nPełny raport: {REPORT.relative_to(ROOT)}")

    return 1 if (missing or (not args.no_http and report.get("broken_urls"))) else 0


if __name__ == "__main__":
    sys.exit(main())
