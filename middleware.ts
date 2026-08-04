import { NextRequest, NextResponse } from "next/server";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth";

export const config = {
  matcher: ["/annotate/:path*", "/admin/:path*"],
};

export async function middleware(request: NextRequest) {
  const session = await verifySessionCookie(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (request.nextUrl.pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/annotate", request.url));
  }

  return NextResponse.next();
}
