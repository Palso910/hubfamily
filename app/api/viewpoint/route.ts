import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { makeViewToken, checkToken, checkViewToken } from '@/lib/sign';

function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function GET(req: NextRequest) {
  if (!(await checkToken(req.cookies.get('hub_pin')?.value))) {
    return NextResponse.json({ error: 'Code famille requis.' }, { status: 401 });
  }
  const id = await checkViewToken(req.cookies.get('hub_view')?.value);
  if (!id) return NextResponse.json({ profile: null });
  const { data, error } = await publicClient().from('profiles').select('id,name,emoji,role').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  if (!data) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: data });
}

export async function POST(req: NextRequest) {
  if (!(await checkToken(req.cookies.get('hub_pin')?.value))) {
    return NextResponse.json({ error: 'Code famille requis.' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = typeof body.profileId === 'string' ? body.profileId : '';
  if (!id) return NextResponse.json({ error: 'Choisis un profil.' }, { status: 400 });
  const { data, error } = await publicClient().from('profiles').select('id,name,emoji,role').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

  const response = NextResponse.json({ profile: data });
  response.cookies.set('hub_view', await makeViewToken(data.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 90 * 86400,
  });
  return response;
}
