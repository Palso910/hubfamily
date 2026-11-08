import { NextRequest, NextResponse } from 'next/server';
import { selectedAdmin } from '@/lib/adminServer';

const ARTICLE_FIELDS = new Set([
  'name', 'url', 'image_path', 'image_url', 'price', 'old_price', 'category',
  'badge_id', 'size', 'color', 'note', 'pinned', 'gifted', 'status',
]);
const BADGE_FIELDS = new Set(['label', 'emoji', 'color', 'rank']);
const SETTINGS_FIELDS = new Set([
  'palette', 'custom', 'logo_url', 'site_name', 'hero', 'onboarding', 'pin_title', 'pin_msg',
]);

function pickFields(value: unknown, allowed: Set<string>) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>).filter(([key]) => allowed.has(key));
  return entries.length ? Object.fromEntries(entries) : null;
}

export async function POST(req: NextRequest) {
  let context: Awaited<ReturnType<typeof selectedAdmin>>;
  try {
    context = await selectedAdmin(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Configuration Supabase indisponible.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });

  const body = await req.json().catch(() => ({}));
  const { table, action, id } = body;
  const recordId = typeof id === 'string' ? id : '';
  let query: any;

  if (table === 'articles') {
    if (action === 'insert') {
      const data = pickFields(body.data, ARTICLE_FIELDS);
      if (!data || !data.name || !data.url || data.price === undefined) {
        return NextResponse.json({ error: 'Nom, lien et prix sont obligatoires.' }, { status: 400 });
      }
      query = context.sb.from('articles').insert({ ...data, owner_id: context.profile.id }).select().single();
    } else if (action === 'update' && recordId) {
      const data = pickFields(body.data, ARTICLE_FIELDS);
      if (!data) return NextResponse.json({ error: 'Aucune valeur modifiable fournie.' }, { status: 400 });
      query = context.sb.from('articles').update(data).eq('id', recordId).eq('owner_id', context.profile.id).select().maybeSingle();
    } else if (action === 'delete' && recordId) {
      query = context.sb.from('articles').delete().eq('id', recordId).eq('owner_id', context.profile.id).select().maybeSingle();
    }
  } else if (table === 'link_reports' && action === 'update' && recordId) {
    query = context.sb.from('link_reports').update({ resolved: body.data?.resolved === true }).eq('id', recordId).select().maybeSingle();
  } else if (table === 'badges' && context.profile.role === 'super_admin') {
    if (action === 'insert') {
      const data = pickFields(body.data, BADGE_FIELDS);
      if (!data?.label) return NextResponse.json({ error: 'Le libellé de la pastille est obligatoire.' }, { status: 400 });
      query = context.sb.from('badges').insert(data).select().single();
    } else if (action === 'update' && recordId) {
      const data = pickFields(body.data, BADGE_FIELDS);
      if (!data) return NextResponse.json({ error: 'Aucune valeur modifiable fournie.' }, { status: 400 });
      query = context.sb.from('badges').update(data).eq('id', recordId).select().maybeSingle();
    } else if (action === 'delete' && recordId) {
      query = context.sb.from('badges').delete().eq('id', recordId).select().maybeSingle();
    }
  } else if (table === 'site_settings' && action === 'update' && context.profile.role === 'super_admin') {
    const data = pickFields(body.data, SETTINGS_FIELDS);
    if (!data) return NextResponse.json({ error: 'Aucun réglage modifiable fourni.' }, { status: 400 });
    query = context.sb.from('site_settings').update(data).eq('id', 1).select().maybeSingle();
  } else if (table === 'profiles' && action === 'insert' && context.profile.role === 'super_admin') {
    const data = pickFields(body.data, new Set(['name', 'emoji', 'role']));
    if (!data?.name || !['membre', 'admin'].includes(String(data.role))) {
      return NextResponse.json({ error: 'Nom ou rôle de profil invalide.' }, { status: 400 });
    }
    query = context.sb.from('profiles').insert(data).select().single();
  } else {
    return NextResponse.json({ error: 'Action non autorisée.' }, { status: 403 });
  }

  if (!query) return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
