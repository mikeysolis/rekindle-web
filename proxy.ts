import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseMiddlewareClient } from "@/lib/database/middleware";
import { normalizeStudioRole } from "@/lib/studio/roles";

const STUDIO_LOGIN_PATH = "/studio/login";
const STUDIO_ACCESS_DENIED_PATH = "/studio/access-denied";

function redirectWithCookies(
  request: NextRequest,
  sourceResponse: NextResponse,
  pathname: string,
  search?: string,
): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = search ?? "";

  const redirectResponse = NextResponse.redirect(redirectUrl);

  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/studio")) {
    return NextResponse.next();
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const isLoginRoute = pathname === STUDIO_LOGIN_PATH;
  const isAccessDeniedRoute = pathname === STUDIO_ACCESS_DENIED_PATH;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return redirectWithCookies(request, response, STUDIO_LOGIN_PATH);
  }

  if (!user) {
    if (isLoginRoute) {
      return response;
    }

    const nextPath = `${pathname}${request.nextUrl.search}`;
    const search = `?next=${encodeURIComponent(nextPath)}`;
    return redirectWithCookies(request, response, STUDIO_LOGIN_PATH, search);
  }

  if (isLoginRoute) {
    return redirectWithCookies(request, response, "/studio");
  }

  const { data: studioUser, error: studioUserError } = await supabase
    .from("studio_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (studioUserError) {
    if (isAccessDeniedRoute) {
      return response;
    }

    return redirectWithCookies(request, response, STUDIO_ACCESS_DENIED_PATH);
  }

  const role = normalizeStudioRole(studioUser?.role ?? null);

  if (!role && !isAccessDeniedRoute) {
    return redirectWithCookies(request, response, STUDIO_ACCESS_DENIED_PATH);
  }

  return response;
}

export const config = {
  matcher: ["/studio/:path*"],
};
