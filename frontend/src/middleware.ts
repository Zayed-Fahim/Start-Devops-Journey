import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL ?? 'http://localhost:5000';

const PUBLIC_PATHS = ['/login', '/register'];

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
      const target = isPublic ? new URL('/', request.url) : request.nextUrl;
      const response = isPublic ? NextResponse.redirect(target) : NextResponse.next();
      refreshed.headers.getSetCookie().forEach((cookie) => {
        response.headers.append('set-cookie', cookie);
      });
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
