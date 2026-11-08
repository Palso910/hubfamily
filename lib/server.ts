import { createClient } from '@supabase/supabase-js';

export const DEFAULTS = { palette: 'sunset-or-noir', custom: {}, logo_url: null, site_name: 'Hub Courses', hero: 'Les envies de Paul & Étienne ✨', onboarding: 'Bienvenue Maman 👋 — voici les articles et demandes de Paul & Étienne', pin_title: 'Entre le code famille', pin_msg: 'Bienvenue dans notre petite boutique 💛' };

/** Réglages lus côté serveur (sans cache) pour éviter le flash de thème */
export async function serverSettings(): Promise<any> {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { fetch: (u: any, i: any) => fetch(u, { ...i, cache: 'no-store' }) },
    });
    const { data } = await sb.from('site_settings').select('*').eq('id', 1).maybeSingle();
    return { ...DEFAULTS, ...(data || {}) };
  } catch {
    return DEFAULTS;
  }
}
