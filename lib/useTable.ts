'use client';
import { useCallback, useEffect, useState } from 'react';
import { sb } from './supabase';

/** Charge une table + se rafraîchit à chaque événement Realtime (INSERT/UPDATE/DELETE) */
export function useTable(table: string, build?: (q: any) => any, onEvent?: (p: any) => void) {
  const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(async () => {
    let q: any = sb.from(table).select('*');
    if (build) q = build(q);
    const { data } = await q;
    setRows(data || []);
  }, [table]);
  useEffect(() => {
    load();
    const ch = sb
      .channel('rt-' + table + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table }, (p: any) => { load(); onEvent?.(p); })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [load]);
  return { rows, reload: load };
}

/** Profil sélectionné après validation du code famille. */
export function useMe() {
  const { rows: profiles } = useTable('profiles');
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewLoaded, setViewLoaded] = useState(false);
  useEffect(() => {
    fetch('/api/viewpoint')
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Impossible de charger le profil.');
        setViewId(result.profile?.id || null);
      })
      .catch(() => setViewId(null))
      .finally(() => setViewLoaded(true));
    const onViewChange = (event: Event) => setViewId((event as CustomEvent<string>).detail);
    window.addEventListener('hub-view-change', onViewChange);
    return () => window.removeEventListener('hub-view-change', onViewChange);
  }, []);
  const selectViewpoint = useCallback(async (profileId: string) => {
    const response = await fetch('/api/viewpoint', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Impossible de choisir ce profil.');
    setViewId(result.profile.id);
    window.dispatchEvent(new CustomEvent('hub-view-change', { detail: result.profile.id }));
  }, []);
  const me = profiles.find((p) => p.id === viewId) || null;
  return {
    me,
    profiles,
    viewLoaded,
    selectViewpoint,
    isAdmin: !!me && me.role !== 'membre',
    isSuper: !!me && me.role === 'super_admin',
  };
}
