'use client';
import { useEffect, useRef, useState } from 'react';
import Carts from '@/components/Carts';
import Feed from '@/components/Feed';
import Requests from '@/components/Requests';
import { toast } from '@/components/Toaster';
import { sb } from '@/lib/supabase';
import { getSid } from '@/lib/utils';
import { useMe, useTable } from '@/lib/useTable';

const SHOPS = [['Zalando', 'zalando.fr'], ['Nike', 'nike.com'], ['Amazon', 'amazon.fr'], ['Adidas', 'adidas.fr'], ['Foot Locker', 'footlocker.fr']];

/** Accueil « Maman » : tout est en temps réel (Realtime → refetch) */
export default function Home() {
  const { me, profiles, isAdmin, viewLoaded, selectViewpoint } = useMe();
  const meRef = useRef<any>();
  meRef.current = me;
  const [tab, setTab] = useState('articles');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [cartId, setCartId] = useState('');
  const [onb, setOnb] = useState(false);
  const [profileError, setProfileError] = useState('');
  const done = useRef(new Set<string>());

  const settings = useTable('site_settings').rows[0] || {};
  const articles = useTable('articles', (q) => q.order('created_at', { ascending: false }), (p) => {
    if (p.eventType === 'INSERT' && p.new.owner_id !== meRef.current?.id) toast('Un nouvel article vient d’arriver ✨');
  }).rows;
  const badges = useTable('badges', (q) => q.order('rank')).rows;
  const comments = useTable('comments', (q) => q.order('created_at')).rows;
  const reactions = useTable('reactions').rows;
  const requests = useTable('requests', (q) => q.order('created_at', { ascending: false })).rows;
  const carts = useTable('carts', (q) => q.eq('sid', getSid()).order('created_at')).rows;
  const items = useTable('cart_items').rows;
  const cart = carts.find((c) => c.id === cartId) || carts[0];

  useEffect(() => setOnb(!/hub_onb=1/.test(document.cookie)), []);
  useEffect(() => {
    const changeTab = (event: Event) => setTab((event as CustomEvent<string>).detail);
    window.addEventListener('hub-tab-change', changeTab);
    const requestedTab = new URLSearchParams(window.location.search).get('section');
    if (['articles', 'requests', 'carts', 'shops'].includes(requestedTab || '')) setTab(requestedTab!);
    return () => window.removeEventListener('hub-tab-change', changeTab);
  }, []);

  // Toast « Maman a validé ta demande ✅ » : à l'ouverture du site ou en direct
  useEffect(() => {
    if (!me) return;
    requests.filter((r) => r.requester_id === me.id && r.status !== 'pending' && !r.notified && !done.current.has(r.id)).forEach(async (r) => {
      done.current.add(r.id);
      const by = profiles.find((p) => p.id === r.decided_by)?.name || 'Quelqu’un';
      toast(`${by} a ${r.status === 'approved' ? 'validé' : 'refusé'} ta demande ${r.status === 'approved' ? '✅' : '❌'}${r.decision_note ? ' — ' + r.decision_note : ''}`);
      await sb.from('requests').update({ notified: true }).eq('id', r.id);
    });
  }, [requests, me?.id, profiles.length]);

  const waiting = requests.filter((r) => r.status === 'pending' && me && r.requester_id !== me.id).length;
  const pending = requests.filter((r) => r.status === 'pending').length;
  const activeArticles = articles.filter((a) => a.status !== 'removed').length;
  const filteredArticles = ownerFilter ? articles.filter((article) => article.owner_id === ownerFilter) : articles;
  const isMaman = me?.name?.toLowerCase() === 'maman';
  const defaultHero = isMaman ? 'Bienvenue Maman 👋' : `Les envies de ${me?.name || 'la famille'}`;
  const heroTitle = settings.hero === 'Les envies de Paul & Étienne ✨' ? defaultHero : settings.hero || defaultHero;
  const T = [['articles', '🛍️', 'Articles'], ['requests', '📨', 'Demandes'], ['carts', '🛒', 'Paniers'], ['shops', '🏬', 'Boutique']];

  if (!viewLoaded) return <section className="card profile-loading" aria-live="polite">Chargement des profils…</section>;
  if (!me) return (
    <section className="profile-picker">
      <div className="profile-picker-heading">
        <span className="hero-kicker"><span /> NOS ENVIES, NOS PETITS BONHEURS</span>
        <h1>Bienvenue dans notre petite boutique 💛</h1>
        <p className="muted">Choisis ton point de vue pour retrouver ton espace familial.</p>
      </div>
      {profileError && <p role="alert" className="profile-error">{profileError}</p>}
      <div className="grid profile-grid">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            className="card profile-option"
            onClick={async () => {
              setProfileError('');
              try {
                await selectViewpoint(profile.id);
              } catch (error) {
                setProfileError(error instanceof Error ? error.message : 'Impossible de sélectionner ce profil.');
              }
            }}
          >
            <span className="profile-emoji" aria-hidden="true">{profile.emoji}</span>
            <span className="profile-name">{profile.name}</span>
            <span className="profile-role">{profile.role === 'super_admin' ? 'Les envies de Paul' : profile.role === 'admin' ? 'Les envies d’Étienne' : 'La vue de Maman'}</span>
          </button>
        ))}
        {!profiles.length && <p className="muted">Les profils n’ont pas pu être chargés. Vérifie que Supabase est disponible.</p>}
      </div>
      <p className="profile-security-note">Le code famille donne accès à toutes les vues, y compris les espaces admin.</p>
    </section>
  );

  return (
    <>
      <section className="hero family-hero">
        <div className="hero-copy">
          <span className="hero-kicker"><span /> NOS ENVIES, NOS PETITS BONHEURS</span>
          <h1>{heroTitle}</h1>
          <p>{isMaman ? '— les articles et demandes de Paul & Étienne' : '— les envies de la famille, à partager ensemble'}</p>
          {isMaman && (
            <div className="family-filters" aria-label="Filtrer les envies par personne">
              <button className="family-filter" aria-pressed={!ownerFilter} onClick={() => setOwnerFilter('')}>Toute la famille</button>
              {profiles.filter((profile) => profile.name.toLowerCase() !== 'maman').map((profile) => (
                <button key={profile.id} className="family-filter" aria-pressed={ownerFilter === profile.id} onClick={() => setOwnerFilter(ownerFilter === profile.id ? '' : profile.id)}>
                  {profile.name === 'Étienne' ? '🔥 ' : ''}Les envies de {profile.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      <div className="tabs home-tabs" role="tablist" aria-label="Rubriques">
        {T.map(([k, icon, label]) => (
          <button key={k} role="tab" className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            <span className="tab-icon" aria-hidden="true">{icon}</span><span>{label}</span>
            {k === 'requests' && waiting > 0 && <span className="tab-count">{waiting}</span>}
          </button>
        ))}
      </div>
      {tab === 'articles' && <Feed {...{ articles: filteredArticles, badges, comments, reactions, profiles, me, isAdmin, cart, items }} sid={getSid()} />}
      {tab === 'requests' && <Requests {...{ requests, profiles, badges, me }} />}
      {tab === 'carts' && <Carts {...{ carts, items, articles, cart, setCartId }} />}
      {tab === 'shops' && (
        <div className="grid">{SHOPS.map(([n, d]) => (
          <a key={d} className="card btn ghost" style={{ minHeight: 90, flexDirection: 'column' }} href={`https://www.${d}`} target="_blank" rel="noopener noreferrer">
            <img src={`https://www.google.com/s2/favicons?domain=${d}&sz=64`} alt="" width={40} height={40} /><b>{n} ↗</b>
          </a>))}
        </div>
      )}
      {onb && (
        <div className="overlay" role="dialog"><div className="card" style={{ maxWidth: 420, textAlign: 'center', padding: 28 }}>
          <h1>{settings.onboarding || 'Bienvenue 👋'}</h1>
          <button className="btn" style={{ width: '100%', minHeight: 56 }} onClick={() => { document.cookie = 'hub_onb=1;path=/;max-age=31536000'; setOnb(false); }}>C’est parti ✨</button>
        </div></div>
      )}
    </>
  );
}
