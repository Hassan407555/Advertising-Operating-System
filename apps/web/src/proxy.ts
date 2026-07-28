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
    "/ad-sets/:path*",
    "/ads/:path*",
    "/creatives/:path*",
    "/creative-assets/:path*",
    "/storage/:path*",
    "/campaign-generator/:path*",
    "/ai-copy/:path*",
    "/publisher/:path*",
    "/synchronization/:path*",
    "/automation/:path*",
    "/analytics/:path*",
    "/reports/:path*",
    "/shopify/:path*",
    "/platform-connections/:path*",
    "/platform-credentials/:path*",
    "/ad-accounts/:path*",
    "/organization/:path*",
    "/members/:path*",
    "/invitations/:path*",
    "/memberships/:path*",
    "/profile/:path*",
    "/forbidden/:path*",
    "/settings/:path*",
  ],
};
