import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function middleware(request: NextRequest) {
  // Only proxy when NEXT_PUBLIC_API_URL is set (production)
  // Local dev uses next.config.ts rewrites instead
  if (!API_URL) return NextResponse.next();

  const destination = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    API_URL,
  );

  const headers = new Headers(request.headers);
  headers.set('ngrok-skip-browser-warning', 'true');

  return NextResponse.rewrite(destination, {
    request: { headers },
  });
}

export const config = {
  matcher: '/api/:path*',
};
