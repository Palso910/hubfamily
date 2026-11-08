import { NextRequest, NextResponse } from 'next/server';
import { selectedAdmin } from '@/lib/adminServer';

// Vérifie qu'un lien marchand répond pour l'admin sélectionné.
export async function POST(req: NextRequest) {
  let context: Awaited<ReturnType<typeof selectedAdmin>>;
  try {
    context = await selectedAdmin(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Configuration Supabase indisponible.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });

  const { url } = await req.json().catch(() => ({}));
  let u: URL;
  try {
    u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)/.test(u.hostname)) throw 0;
  } catch {
    return NextResponse.json({ ok: false, status: 0, msg: 'URL invalide' });
  }
  const opt = { redirect: 'follow' as const, signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'Mozilla/5.0 (HubCourses link check)' } };
  try {
    let r = await fetch(u, { method: 'HEAD', ...opt });
    if ([405, 501].includes(r.status)) r = await fetch(u, { method: 'GET', ...opt });
    // soft = le site bloque les robots (403/429…) : on prévient sans bloquer
    return NextResponse.json({ ok: r.status < 400, soft: [401, 403, 429, 503].includes(r.status), status: r.status });
  } catch {
    return NextResponse.json({ ok: false, status: 0, msg: 'Site injoignable' });
  }
}
