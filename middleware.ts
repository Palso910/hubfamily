import { NextResponse, type NextRequest } from 'next/server';
import { checkToken } from '@/lib/sign';

// Routes accessibles sans PIN
const OPEN = ['/pin', '/api/pin', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/favicon.ico'];

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  let res: NextResponse;
  if (OPEN.some((o) => p === o || p.startsWith(o + '/')) || (await checkToken(req.cookies.get('hub_pin')?.value))) {
    res = NextResponse.next();
  } else if (p.startsWith('/api/')) {
    res = NextResponse.json({ error: 'pin' }, { status: 401 });
  } else {
    const u = req.nextUrl.clone();
    u.pathname = '/pin';
    u.search = '';
    res = NextResponse.redirect(u);
  }
  // Identifiant de session anonyme (rattache les paniers côté serveur)
  if (!req.cookies.get('hub_sid')) res.cookies.set('hub_sid', crypto.randomUUID(), { maxAge: 31536e3, path: '/', sameSite: 'lax' });
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
