import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isLoggedIn = req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");
  const isApi = req.nextUrl.pathname.startsWith("/api/");
  const isStatic = req.nextUrl.pathname.startsWith("/_next") || req.nextUrl.pathname.startsWith("/favicon.ico") || req.nextUrl.pathname.startsWith("/uploads");

  if (isStatic || isApi) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
