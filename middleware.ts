import { NextRequest, NextResponse } from "next/server";

// Basic Auth dla /admin (bez zewnętrznej biblioteki). Ustaw ADMIN_USER/ADMIN_PASS w .env.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/programs")) {
    return NextResponse.next();
  }
  // GET /api/programs jest publiczny (feed dla mapy), reszta metod = admin.
  if (pathname.startsWith("/api/programs") && req.method === "GET") {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASS || "change-me-please";

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString();
      const idx = decoded.indexOf(":");
      const u = decoded.slice(0, idx);
      const p = decoded.slice(idx + 1);
      if (u === user && p === pass) return NextResponse.next();
    }
  }
  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="grant-atlas admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/programs/:path*"],
};
