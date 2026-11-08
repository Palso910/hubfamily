import { NextRequest, NextResponse } from 'next/server';
import { selectedAdmin } from '@/lib/adminServer';

export async function POST(req: NextRequest) {
  let context: Awaited<ReturnType<typeof selectedAdmin>>;
  try {
    context = await selectedAdmin(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Configuration Supabase indisponible.';
    return NextResponse.json({ error: message }, { status: 503 });
  }
  if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });

  const form = await req.formData();
  const file = form.get('file');
  const scope = form.get('scope');
  if (!(file instanceof File) || file.type !== 'image/webp' || file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image WebP invalide ou trop volumineuse (8 Mo maximum).' }, { status: 400 });
  }
  if (scope !== 'article' && scope !== 'logo') {
    return NextResponse.json({ error: 'Type d’image invalide.' }, { status: 400 });
  }
  if (scope === 'logo' && context.profile.role !== 'super_admin') {
    return NextResponse.json({ error: 'Seul Paul peut modifier le logo.' }, { status: 403 });
  }

  const path = scope === 'logo'
    ? `logo/${crypto.randomUUID()}.webp`
    : `${context.profile.id}/${crypto.randomUUID()}.webp`;
  const { error } = await context.sb.storage.from('articles').upload(path, await file.arrayBuffer(), {
    contentType: 'image/webp',
    upsert: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data } = context.sb.storage.from('articles').getPublicUrl(path);
  return NextResponse.json({ path, url: data.publicUrl });
}
