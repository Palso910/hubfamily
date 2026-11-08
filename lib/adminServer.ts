import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { checkToken, checkViewToken } from './sign';

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('La variable serveur SUPABASE_SERVICE_ROLE_KEY manque dans Vercel.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function selectedAdmin(req: NextRequest) {
  if (!(await checkToken(req.cookies.get('hub_pin')?.value))) {
    return { error: 'Code famille requis.', status: 401 as const };
  }
  const profileId = await checkViewToken(req.cookies.get('hub_view')?.value);
  if (!profileId) return { error: 'Choisis d’abord un profil.', status: 409 as const };

  const sb = adminClient();
  const { data: profile, error } = await sb.from('profiles').select('id,name,emoji,role').eq('id', profileId).maybeSingle();
  if (error) return { error: error.message, status: 500 as const };
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { error: 'Ce profil ne dispose pas des fonctions admin.', status: 403 as const };
  }
  return { sb, profile };
}
