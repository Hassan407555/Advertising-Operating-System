import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const publicRoutes = new Set(["/login", "/register"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("aos.access-token")?.value;

  if (publicRoutes.has(pathname)) {
    return NextResponse.next();
  }

  if (!accessToken) {
    const unauthorizedUrl = new URL("/unauthorized", request.url);
    unauthorizedUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(unauthorizedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/campaigns/:path*",
    "/analytics/:path*",
    "/shopify/:path*",
    "/advertising/:path*",
    "/products",
    "/products/:path*",
    "/ai-sessions/:path*",
    "/organization/:path*",
    "/members/:path*",
    "/invitations/:path*",
    "/profile/:path*",
    "/forbidden/:path*",
    "/settings/:path*",
  ],
};
