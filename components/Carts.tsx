'use client';
import { useState } from 'react';
import { sb } from '@/lib/supabase';
import { eur, getSid } from '@/lib/utils';
import { toast } from './Toaster';

/** Paniers simulés (persistés en base, rattachés au cookie de session) + jauge de budget */
export default function Carts({ carts, items, articles, cart, setCartId }: any) {
  const [name, setName] = useState(''), [budget, setBudget] = useState('');
  async function create() {
    if (!name.trim()) return toast('Donne un nom au panier (Noël, Anniversaire…)');
    const { data } = await sb.from('carts').insert({ sid: getSid(), name: name.trim(), budget: +budget || 0 }).select().single();
    setName(''); setBudget(''); if (data) setCartId(data.id);
  }
  const lines = cart ? items.filter((i: any) => i.cart_id === cart.id).map((i: any) => ({ i, a: articles.find((a: any) => a.id === i.article_id) })).filter((x: any) => x.a) : [];
  const total = lines.reduce((s: number, x: any) => s + Number(x.a.price), 0);
  const left = cart ? Number(cart.budget) - total : 0;
  const w = cart && cart.budget > 0 ? Math.min(100, (total / cart.budget) * 100) : 0;

  return (
    <section className="carts-page">
      <div className="section-heading carts-heading">
        <span className="hero-kicker"><span /> NOËL 2026 / EN FAMILLE, TOUT SIMPLEMENT</span>
        <h1>Un Noël à leur image 🎁</h1>
        <p className="muted">On choisit, on ajuste, on en parle. Juste une liste d’idées, pas une commande.</p>
      </div>
      <div className="row" style={{ margin: '8px 0' }}>
        {carts.map((c: any) => <button key={c.id} className="tab" aria-selected={cart?.id === c.id} onClick={() => setCartId(c.id)}>{c.name}</button>)}
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row"><input style={{ flex: 2 }} placeholder="Nouveau panier (ex. Noël)" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={{ flex: 1 }} type="number" min="0" placeholder="Budget €" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <button className="btn" onClick={create}>Créer</button></div>
      </div>
      {cart ? (
        <div className="card cart-card">
          <div className="row"><h2 style={{ flex: 1 }}>{cart.name}</h2>
            <button className="link" onClick={async () => { if (confirm('Supprimer ce panier ?')) await sb.from('carts').delete().eq('id', cart.id); }}>Supprimer</button></div>
          <p><b>{lines.length}</b> article(s) · Total <span className="price">{eur(total)}</span></p>
          {cart.budget > 0 && (
            <>
              <div className="gauge" role="progressbar" aria-valuenow={Math.round(w)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: w + '%' }} /></div>
              <p>Budget {cart.name} : {eur(cart.budget)} — {left >= 0 ? <>reste <b>{eur(left)}</b></> : <b style={{ color: 'var(--accent)' }}>dépassé de {eur(-left)}</b>}</p>
            </>
          )}
          {lines.map(({ i, a }: any) => (
            <div className="row" key={i.id} style={{ justifyContent: 'space-between', padding: '6px 0' }}>
              <span>{a.name}</span><span className="row"><b>{eur(a.price)}</b><button className="btn ghost" aria-label="Retirer" onClick={() => sb.from('cart_items').delete().eq('id', i.id)}>✕</button></span>
            </div>
          ))}
          {!lines.length && <p className="muted">Coche des articles depuis le fil avec « 🛒 Panier ».</p>}
        </div>
      ) : <p className="muted">Crée ton premier panier ci-dessus 🛒</p>}
    </section>
  );
}
