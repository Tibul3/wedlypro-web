import { NextResponse, type NextRequest } from "next/server";

const gatedPrefixes = ["/app", "/login", "/signup"];
const bypassCookieName = "wedly_preview";

function isGatedPath(pathname: string): boolean {
  return gatedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (!isGatedPath(pathname)) {
    return NextResponse.next();
  }

  const bypassToken = process.env.COMING_SOON_BYPASS_TOKEN;
  const queryPreviewToken = searchParams.get("preview");

  if (bypassToken && queryPreviewToken && queryPreviewToken === bypassToken) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("preview");

    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set(bypassCookieName, bypassToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  }

  const existingCookie = request.cookies.get(bypassCookieName)?.value;
  if (bypassToken && existingCookie === bypassToken) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/coming-soon";
  redirectUrl.search = "";
  redirectUrl.searchParams.set("next", pathname);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/app/:path*", "/login", "/signup"],
};
