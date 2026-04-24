import { NextRequest, NextResponse } from "next/server";

/**
 * HTTP Basic Auth middleware.
 *
 * Set BASIC_AUTH_USER and BASIC_AUTH_PASSWORD as environment variables in Vercel
 * (Project → Settings → Environment Variables). If either is missing, the app
 * runs unprotected — that way local dev still works without credentials.
 *
 * Browsers show a native username/password prompt on first request and cache
 * the credentials for the session.
 */

export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  if (!user || !pass) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const idx = decoded.indexOf(":");
      const suppliedUser = idx === -1 ? decoded : decoded.slice(0, idx);
      const suppliedPass = idx === -1 ? "" : decoded.slice(idx + 1);

      if (suppliedUser === user && suppliedPass === pass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="xentral Copy Studio", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for Next.js internals and static files.
     * (_next, favicon, etc. stay unprotected so the auth prompt loads clean.)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
