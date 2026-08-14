import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:5000';

const PUBLIC_PATHS = ['/login', '/register'];

function parseSetCookies(setCookies: string[]): Map<string, string> {
  const jar = new Map<string, string>();
  setCookies.forEach((raw) => {
    const [pair] = raw.split(';');
    const index = pair.indexOf('=');
    if (index < 0) return;
    jar.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  });
  return jar;
}

function mergeCookieHeader(request: NextRequest, refreshedJar: Map<string, string>): string {
  const merged = new Map<string, string>();
  request.cookies.getAll().forEach(({ name, value }) => merged.set(name, value));
  refreshedJar.forEach((value, name) => {
    if (value) merged.set(name, value);
    else merged.delete(name);
  });
  return [...merged].map(([name, value]) => `${name}=${value}`).join('; ');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (accessToken) {
    if (isPublic) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  if (refreshToken) {
    const refreshed = await fetch(`${INTERNAL_API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') ?? '' },
    }).catch(() => null);

    if (refreshed?.ok) {
      const setCookies = refreshed.headers.getSetCookie();
      const refreshedJar = parseSetCookies(setCookies);

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('cookie', mergeCookieHeader(request, refreshedJar));

      const response = isPublic
        ? NextResponse.redirect(new URL('/', request.url))
        : NextResponse.next({ request: { headers: requestHeaders } });

      setCookies.forEach((cookie) => response.headers.append('set-cookie', cookie));
      return response;
    }
  }

  if (isPublic) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  response.cookies.delete('csrf_token');
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
