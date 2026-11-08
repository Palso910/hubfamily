'use client';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { sb } from '@/lib/supabase';
import { eur, imgUrl, pct } from '@/lib/utils';
import Badge from './Badge';
import { toast } from './Toaster';

const EMO = ['❤️', '👍', '😂'];
const ST: any = { in_stock: 'En stock', sale: 'En réduction', out: 'Rupture' };

/** Commentaires d'un article : Maman écrit sans compte, les admins répondent (bulle distinguée) */
function Thread({ a, comments, profiles, me, isAdmin }: any) {
  const [t, setT] = useState('');
  const [re, setRe] = useState<string | null>(null);
  const send = async () => {
    if (!t.trim() || !me) return;
    await sb.from('comments').insert({ article_id: a.id, author_id: me.id, body: t.trim(), parent_id: re });
    setT(''); setRe(null);
  };
  const bubble = (c: any) => {
    const p = profiles.find((x: any) => x.id === c.author_id);
    return (
      <div key={c.id} className={'bubble' + (p && p.role !== 'membre' ? ' admin' : '')} style={c.parent_id ? { marginLeft: 24 } : {}}>
        <b>{p?.emoji} {p?.name}</b> · {c.body}
        {isAdmin && !c.parent_id && <button className="link" onClick={() => setRe(c.id)}>Répondre</button>}
      </div>
    );
  };
  return (
    <div>
      {comments.filter((c: any) => !c.parent_id).map((c: any) => [bubble(c), ...comments.filter((r: any) => r.parent_id === c.id).map(bubble)])}
      {re && <small className="muted">Réponse en cours… <button className="link" onClick={() => setRe(null)}>annuler</button></small>}
      <div className="row"><input style={{ flex: 1 }} value={t} onChange={(e) => setT(e.target.value)} placeholder="Écrire un commentaire…" onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className="btn" onClick={send}>Envoyer</button></div>
    </div>
  );
}

export default function Feed({ articles, badges, comments, reactions, profiles, me, isAdmin, sid, cart, items }: any) {
  const [q, setQ] = useState(''), [cat, setCat] = useState(''), [imp, setImp] = useState(''), [st, setSt] = useState('');
  const [asc, setAsc] = useState(false), [open, setOpen] = useState<string | null>(null);
  const bm = useMemo(() => Object.fromEntries(badges.map((b: any) => [b.id, b])), [badges]);

  const list = useMemo(() => {
    const k = q.toLowerCase();
    return articles
      .filter((a: any) => a.status !== 'removed')
      .filter((a: any) => (!cat || a.category === cat) && (!imp || a.badge_id === imp))
      .filter((a: any) => !st || (st === 'sale' ? a.status === 'sale' || pct(a) > 0 : a.status === st))
      .filter((a: any) => !k || [a.name, a.note, a.color].join(' ').toLowerCase().includes(k))
      .sort((a: any, b: any) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (asc ? a.price - b.price : +new Date(b.created_at) - +new Date(a.created_at)));
  }, [articles, q, cat, imp, st, asc]);
  const pinned = articles.filter((a: any) => a.pinned && a.status !== 'removed').slice(0, 3);

  async function toggleCart(a: any) {
    if (!cart) return toast('Crée d’abord un panier dans l’onglet Paniers 🛒');
    const ex = items.find((i: any) => i.cart_id === cart.id && i.article_id === a.id);
    if (ex) await sb.from('cart_items').delete().eq('id', ex.id);
    else await sb.from('cart_items').insert({ cart_id: cart.id, article_id: a.id });
  }
  async function react(a: any, e: string) {
    const ex = reactions.find((r: any) => r.article_id === a.id && r.emoji === e && r.sid === sid);
    if (ex) await sb.from('reactions').delete().eq('id', ex.id);
    else await sb.from('reactions').insert({ article_id: a.id, emoji: e, sid });
  }
  async function report(a: any) {
    await sb.from('link_reports').insert({ article_id: a.id });
    toast('Merci ! Paul est prévenu 🔗');
  }

  const card = (a: any, mini = false) => {
    const d = pct(a), inCart = cart && items.find((i: any) => i.cart_id === cart.id && i.article_id === a.id);
    const cs = comments.filter((c: any) => c.article_id === a.id);
    const src = imgUrl(a);
    let host = ''; try { host = new URL(a.url).hostname.replace('www.', ''); } catch {}
    return (
      <article className="card product-card" key={(mini ? 'p' : '') + a.id} style={a.gifted ? { opacity: 0.6 } : {}}>
        <div className="product-image-wrap">
          {src
            ? <Image className="thumb" src={src} alt={a.name} width={700} height={700} sizes="(max-width:600px) 92vw, (max-width:1000px) 45vw, 30vw" />
            : <div className="product-placeholder" aria-hidden="true">🛍️</div>}
          {d > 0 && <span className="product-discount">-{d} %</span>}
          {a.pinned && <span className="product-favorite" aria-label="Dans la sélection du moment">✦</span>}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <Badge b={bm[a.badge_id]} />
          {a.status === 'out' && <span className="pill" style={{ background: '#B91C1C', color: '#fff' }}>Rupture</span>}
          {a.gifted && <span className="pill promo">🎁 Déjà offert</span>}
        </div>
        <h3>{a.name}</h3>
        <div><span className="price">{eur(a.price)}</span>{d > 0 && <span className="old">{eur(a.old_price)}</span>}</div>
        <p className="muted" style={{ margin: '4px 0' }}>{[a.size && `Taille ${a.size}`, a.color].filter(Boolean).join(' · ')}</p>
        {a.note && !mini && <p>💬 {a.note}</p>}
        {!mini && (
          <>
            <div className="row">
              <a className="btn" href={a.url} target="_blank" rel="noopener noreferrer">Voir sur {host.split('.')[0] || 'le site'} ↗</a>
              <button className="btn ghost" onClick={() => toggleCart(a)} aria-pressed={!!inCart}>{inCart ? '✅ Dans le panier' : '🛒 Panier'}</button>
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              {EMO.map((e) => {
                const n = reactions.filter((r: any) => r.article_id === a.id && r.emoji === e).length;
                const mine = reactions.some((r: any) => r.article_id === a.id && r.emoji === e && r.sid === sid);
                return <button key={e} className={'btn ' + (mine ? '' : 'ghost')} onClick={() => react(a, e)}>{e} {n || ''}</button>;
              })}
              <button className="btn ghost" onClick={() => setOpen(open === a.id ? null : a.id)}>💬 {cs.length}</button>
              <button className="link" onClick={() => report(a)}>Lien cassé ?</button>
            </div>
            {open === a.id && <Thread a={a} comments={cs} profiles={profiles} me={me} isAdmin={isAdmin} />}
          </>
        )}
      </article>
    );
  };

  return (
    <section>
      {pinned.length > 0 && !q && !cat && !imp && !st && (
        <>
          <div className="section-heading">
            <span className="hero-kicker"><span /> TROIS IDÉES CHOISIES AVEC AMOUR</span>
            <h2>Ma sélection du moment</h2>
            <p className="muted">Les envies qui leur ressemblent vraiment.</p>
          </div>
          <div className="grid">{pinned.map((a: any) => card(a, true))}</div>
        </>
      )}
      <div className="card feed-toolbar" style={{ margin: '24px 0 16px' }}>
        <input placeholder="🔎 Rechercher un article…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Recherche" />
        <div className="row" style={{ marginTop: 8 }}>
          <select style={{ flex: 1 }} value={imp} onChange={(e) => setImp(e.target.value)} aria-label="Importance"><option value="">Toutes importances</option>{badges.map((b: any) => <option key={b.id} value={b.id}>{b.emoji} {b.label}</option>)}</select>
          <select style={{ flex: 1 }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Catégorie"><option value="">Toutes catégories</option><option value="chaussures">Chaussures</option><option value="vetements">Vêtements</option><option value="accessoires">Accessoires</option></select>
          <select style={{ flex: 1 }} value={st} onChange={(e) => setSt(e.target.value)} aria-label="Statut"><option value="">Tous statuts</option>{Object.entries(ST).map(([k, v]: any) => <option key={k} value={k}>{v}</option>)}</select>
          <button className={'btn ' + (asc ? '' : 'ghost')} onClick={() => setAsc(!asc)}>Prix ↑</button>
        </div>
      </div>
      <div className="section-heading feed-heading">
        <span className="hero-kicker"><span /> À DÉCOUVRIR</span>
        <h2>Les envies de la famille</h2>
      </div>
      <div className="grid">{list.map((a: any) => card(a))}</div>
      {!list.length && <p className="muted">Aucun article pour l’instant ✨</p>}
    </section>
  );
}
