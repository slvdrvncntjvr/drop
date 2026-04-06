import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/s/", "/api/auth", "/api/files/"];

function hasSessionCookie(request: NextRequest) {
  return [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ].some((name) => request.cookies.has(name));
}

export function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const isPublic = publicPaths.some((path) => nextUrl.pathname === path || nextUrl.pathname.startsWith(path));

  if (isPublic) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(request)) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("from", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};