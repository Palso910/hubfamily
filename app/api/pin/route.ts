import { NextRequest, NextResponse } from 'next/server';
import { makeToken, safeEq } from '@/lib/sign';

// Anti-brute-force en mémoire d'instance (suffisant pour un usage famille)
const tries = new Map<string, { n: number; until: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'x';
  const t = tries.get(ip) || { n: 0, until: 0 };
  if (t.until > Date.now()) return NextResponse.json({ error: 'locked', wait: Math.ceil((t.until - Date.now()) / 1000) }, { status: 429 });

  const { pin } = await req.json().catch(() => ({}));
  const SITE_PIN = process.env.SITE_PIN || '';
  if (!SITE_PIN) {
    return NextResponse.json(
      { error: "La variable SITE_PIN n'est pas configurée côté serveur. Ajoute-la dans Vercel (Settings > Environment Variables) puis redéploie." },
      { status: 500 },
    );
  }
  const ok = safeEq(String(pin || ''), SITE_PIN);
  if (!ok) {
    t.n++;
    if (t.n >= 3) t.until = Date.now() + 60000 * Math.min(t.n - 2, 10); // 3 essais puis 1, 2, 3… min
    tries.set(ip, t);
    return NextResponse.json({ error: 'bad', left: Math.max(0, 3 - t.n) }, { status: 401 });
  }
  tries.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('hub_pin', await makeToken(90), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 90 * 86400 });
  return res;
}

// Bouton « Verrouiller »
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('hub_pin');
  res.cookies.delete('hub_view');
  return res;
}
