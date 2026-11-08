'use client';
import { useEffect, useState } from 'react';
import Badge from '@/components/Badge';
import { toast } from '@/components/Toaster';
import { PAL, PALETTES, checks, themeVars } from '@/lib/palettes';
import { sb } from '@/lib/supabase';
import { useMe, useTable } from '@/lib/useTable';
import { compress, eur, imgUrl, pct } from '@/lib/utils';
import { adminAction, adminUpload } from '@/lib/adminClient';

const err = (e: any) => e && toast('Erreur : ' + e.message);
async function runAdmin(table: string, action: 'insert' | 'update' | 'delete', data?: Record<string, unknown>, id?: string) {
  try {
    return await adminAction(table, action, data, id);
  } catch (error) {
    err(error);
    return null;
  }
}

/** Courbe SVG de l'historique de prix */
function Spark({ pts }: { pts: number[] }) {
  if (pts.length < 2) return <small className="muted">Un seul prix enregistré ({pts[0]} €)</small>;
  const mn = Math.min(...pts), mx = Math.max(...pts), W = 300, H = 80;
  const xy = pts.map((p, i) => `${(i / (pts.length - 1)) * W},${H - 8 - ((p - mn) / (mx - mn || 1)) * (H - 16)}`).join(' ');
  return <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="80" role="img" aria-label="Courbe de prix"><polyline points={xy} fill="none" stroke="var(--accent)" strokeWidth="3" /></svg>;
}

/** Ligne d'article : édition rapide, statut, épinglage, historique de prix */
function Row({ a, badges }: any) {
  const [v, setV] = useState({ name: a.name, price: a.price, old_price: a.old_price ?? '' });
  const [h, setH] = useState<any[] | null>(null);
  const upd = async (p: any) => runAdmin('articles', 'update', p, a.id);
  const hist = async () => {
    if (h) return setH(null);
    const { data } = await sb.from('price_history').select('*').eq('article_id', a.id).order('changed_at');
    setH(data || []);
  };
  return (
    <div className="card">
      <div className="row">
        {imgUrl(a) && <img src={imgUrl(a)} alt="" width={56} height={56} style={{ borderRadius: 10, objectFit: 'cover' }} />}
        <input style={{ flex: 2, minWidth: 140 }} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <input style={{ width: 90 }} type="number" step="0.01" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value as any })} aria-label="Prix" />
        <input style={{ width: 90 }} type="number" step="0.01" value={v.old_price} onChange={(e) => setV({ ...v, old_price: e.target.value as any })} placeholder="Avant" aria-label="Prix avant" />
        <button className="btn" onClick={() => upd({ name: v.name, price: +v.price, old_price: v.old_price === '' ? null : +v.old_price })}>💾</button>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        {pct(a) > 0 && <span className="pill promo">-{pct(a)}%</span>}
        <select style={{ width: 150 }} value={a.status} onChange={(e) => upd({ status: e.target.value })} aria-label="Statut">
          <option value="in_stock">En stock</option><option value="sale">En réduction</option><option value="out">Rupture</option><option value="removed">Retiré</option></select>
        <select style={{ width: 170 }} value={a.badge_id || ''} onChange={(e) => upd({ badge_id: e.target.value || null })} aria-label="Pastille">
          <option value="">— pastille —</option>{badges.map((b: any) => <option key={b.id} value={b.id}>{b.emoji} {b.label}</option>)}</select>
        <button className={'btn ' + (a.pinned ? '' : 'ghost')} onClick={() => upd({ pinned: !a.pinned })}>📌</button>
        <button className={'btn ' + (a.gifted ? '' : 'ghost')} onClick={() => upd({ gifted: !a.gifted })}>🎁</button>
        <button className="btn ghost" onClick={hist}>📈</button>
        <button className="btn ko" onClick={async () => confirm('Supprimer ?') && runAdmin('articles', 'delete', undefined, a.id)}>🗑</button>
      </div>
      {h && <Spark pts={h.map((x) => +x.new_price)} />}
    </div>
  );
}

/** Ajout d'article : upload (drag & drop) compressé, URL de secours, lien vérifié côté serveur */
function ArticleForm({ me, badges }: any) {
  const empty = { name: '', url: '', price: '', old_price: '', category: 'chaussures', badge_id: '', size: '', color: '', note: '', pinned: false, image_url: '' };
  const [f, setF] = useState<any>(empty);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF({ ...f, [k]: v });

  async function submit() {
    if (!f.name || !f.url || f.price === '') return toast('Nom, lien et prix sont obligatoires');
    setBusy(true);
    try {
      const response = await fetch('/api/check-link', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: f.url }) });
      const check = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(check.error || `Vérification impossible (${response.status}).`);
      if (!check.ok && !(check.soft && confirm(`Le site répond ${check.status} (il bloque peut-être les robots). Publier quand même ?`))) {
        toast('Lien cassé : ' + (check.msg || 'erreur ' + check.status));
        return;
      }
      let image_path: string | null = null;
      if (file) {
        image_path = (await adminUpload(await compress(file), file.name, 'article')).path;
      }
      const result = await runAdmin('articles', 'insert', {
        owner_id: me.id, name: f.name, url: f.url, price: +f.price, old_price: f.old_price === '' ? null : +f.old_price,
        category: f.category, badge_id: f.badge_id || null, size: f.size || null, color: f.color || null, note: f.note || null,
        pinned: f.pinned, image_path, image_url: file ? null : f.image_url || null, status: f.old_price !== '' && +f.old_price > +f.price ? 'sale' : 'in_stock',
      });
      if (!result) return;
      setF(empty); setFile(null); toast('Article publié ✨');
    } catch (error) {
      err(error);
    } finally { setBusy(false); }
  }
  const d = f.old_price && +f.old_price > +f.price ? Math.round((1 - f.price / f.old_price) * 100) : 0;
  return (
    <div className="card">
      <h2>Nouvel article</h2>
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0] || null); }}
        style={{ border: '2px dashed var(--cta1)', borderRadius: 14, padding: 18, textAlign: 'center' }}>
        {file ? <>📷 {file.name} <button className="link" onClick={() => setFile(null)}>retirer</button></> : <>Glisse une photo ici ou <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></>}
      </div>
      <label>…ou colle une URL d’image (secours)</label><input value={f.image_url} onChange={(e) => set('image_url', e.target.value)} />
      <label>Nom</label><input value={f.name} onChange={(e) => set('name', e.target.value)} />
      <label>Lien vendeur</label><input type="url" value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://www.zalando.fr/…" />
      <div className="row">
        <div style={{ flex: 1 }}><label>Prix €</label><input type="number" step="0.01" value={f.price} onChange={(e) => set('price', e.target.value)} /></div>
        <div style={{ flex: 1 }}><label>Prix avant promo €</label><input type="number" step="0.01" value={f.old_price} onChange={(e) => set('old_price', e.target.value)} /></div>
        {d > 0 && <span className="pill promo">-{d}%</span>}
      </div>
      <div className="row">
        <div style={{ flex: 1 }}><label>Catégorie</label><select value={f.category} onChange={(e) => set('category', e.target.value)}><option value="chaussures">Chaussures</option><option value="vetements">Vêtements</option><option value="accessoires">Accessoires</option></select></div>
        <div style={{ flex: 1 }}><label>Taille</label><input value={f.size} onChange={(e) => set('size', e.target.value)} /></div>
        <div style={{ flex: 1 }}><label>Couleur</label><input value={f.color} onChange={(e) => set('color', e.target.value)} /></div>
      </div>
      <label>Pastille d’importance</label>
      <div className="row">{badges.map((b: any) => <button key={b.id} className="tab" aria-selected={f.badge_id === b.id} onClick={() => set('badge_id', f.badge_id === b.id ? '' : b.id)}>{b.emoji} {b.label}</button>)}</div>
      <label>Commentaire perso</label><textarea value={f.note} onChange={(e) => set('note', e.target.value)} />
      <label><input type="checkbox" checked={f.pinned} onChange={(e) => set('pinned', e.target.checked)} /> 📌 Épingler en tête</label>
      <p><button className="btn" disabled={busy} onClick={submit}>{busy ? 'Vérification…' : 'Publier'}</button></p>
    </div>
  );
}

function Badges({ badges }: any) {
  const [n, setN] = useState({ label: '', emoji: '⭐', color: '#F5C518', rank: 5 });
  return (
    <div>
      {badges.map((b: any) => (
        <div className="card row" key={b.id} style={{ marginBottom: 8 }}>
          <Badge b={b} />
          <input style={{ width: 70 }} defaultValue={b.emoji} onBlur={async (e) => runAdmin('badges', 'update', { emoji: e.target.value }, b.id)} aria-label="Emoji" />
          <input style={{ flex: 1 }} defaultValue={b.label} onBlur={async (e) => runAdmin('badges', 'update', { label: e.target.value }, b.id)} aria-label="Libellé" />
          <input type="color" defaultValue={b.color} onBlur={async (e) => runAdmin('badges', 'update', { color: e.target.value }, b.id)} aria-label="Couleur" />
          <input style={{ width: 70 }} type="number" defaultValue={b.rank} onBlur={async (e) => runAdmin('badges', 'update', { rank: +e.target.value }, b.id)} aria-label="Ordre" />
          <button className="btn ko" onClick={async () => confirm('Supprimer ?') && runAdmin('badges', 'delete', undefined, b.id)}>🗑</button>
        </div>
      ))}
      <div className="card row">
        <input style={{ width: 70 }} value={n.emoji} onChange={(e) => setN({ ...n, emoji: e.target.value })} />
        <input style={{ flex: 1 }} placeholder="Nouveau libellé" value={n.label} onChange={(e) => setN({ ...n, label: e.target.value })} />
        <input type="color" value={n.color} onChange={(e) => setN({ ...n, color: e.target.value })} />
        <button className="btn" onClick={async () => { if (!n.label) return; if (await runAdmin('badges', 'insert', n)) setN({ ...n, label: '' }); }}>＋ Ajouter</button>
      </div>
    </div>
  );
}

const ROLES: [string, string][] = [['bg', 'Fond'], ['card', 'Cartes'], ['text', 'Texte'], ['muted', 'Texte discret'], ['cta1', 'Bouton (début)'], ['cta2', 'Bouton (fin)'], ['accent', 'Accent']];

/** Thème : 23 palettes + palette libre, prévisualisation en direct, contrastes AA */
function Theme() {
  const { rows } = useTable('site_settings');
  const s = rows[0];
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    if (s && !d) setD({ palette: s.palette, custom: { ...PAL['sunset-or-noir'], ...(s.custom || {}) }, site_name: s.site_name, hero: s.hero, onboarding: s.onboarding, pin_title: s.pin_title, pin_msg: s.pin_msg, logo_url: s.logo_url });
  }, [s]);
  if (!d) return null;
  const p = d.palette === 'custom' ? d.custom : PAL[d.palette];
  const pick = (id: string) => setD({ ...d, palette: id, custom: id === 'custom' ? d.custom : { ...PAL[id] } });
  const logo = async (f?: File) => {
    if (!f) return;
    try {
      const result = await adminUpload(await compress(f, 512), f.name, 'logo');
      setD({ ...d, logo_url: result.url });
    } catch (error) {
      err(error);
    }
  };
  const save = async () => { if (await runAdmin('site_settings', 'update', d)) toast('Thème appliqué chez tout le monde ✨'); };
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
      <div className="card">
        <label>Palette</label>
        <select value={d.palette} onChange={(e) => pick(e.target.value)}>{PALETTES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}<option value="custom">🎨 Personnalisée</option></select>
        {ROLES.map(([k, l]) => (
          <div className="row" key={k} style={{ justifyContent: 'space-between' }}><label style={{ margin: 0 }}>{l}</label>
            <input type="color" value={d.custom[k]} onChange={(e) => setD({ ...d, palette: 'custom', custom: { ...d.custom, [k]: e.target.value } })} /></div>
        ))}
        <h3>Contrastes (AA = 4.5)</h3>
        {checks(p).map(([l, r]) => <div key={l}>{r >= 4.5 ? '✅' : '⚠️'} {l} : {r.toFixed(1)}</div>)}
        <label>Logo</label><input type="file" accept="image/*" onChange={(e) => logo(e.target.files?.[0])} />
        {d.logo_url && <button className="link" onClick={() => setD({ ...d, logo_url: null })}>Retirer le logo</button>}
        {[['site_name', 'Nom du site'], ['hero', 'Titre d’accueil'], ['onboarding', 'Message d’accueil (onboarding)'], ['pin_title', 'Titre écran PIN'], ['pin_msg', 'Message écran PIN']].map(([k, l]) => (
          <div key={k}><label>{l}</label><input value={d[k] || ''} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></div>
        ))}
        <p><button className="btn" onClick={save}>Appliquer</button></p>
      </div>
      <div className="card" style={{ ...(themeVars(d) as any), background: 'var(--bg)', color: 'var(--text)' }}>
        <b>Prévisualisation</b>
        <div className="card" style={{ margin: '10px 0' }}><h3>Sneakers blanches</h3><span className="price">89,00 €</span><span className="old">120,00 €</span> <span className="pill promo">-26%</span>
          <p className="muted">Taille 42 · Blanc</p><span className="btn">Voir sur Zalando ↗</span></div>
        <div className="gauge"><i style={{ width: '62%' }} /></div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { me, isAdmin, isSuper } = useMe();
  const [tab, setTab] = useState('articles');
  const badges = useTable('badges', (q) => q.order('rank')).rows;
  const reports = useTable('link_reports', (q) => q.order('created_at', { ascending: false }), (p) => p.eventType === 'INSERT' && toast('🔗 Un lien a été signalé !')).rows;
  const profiles = useTable('profiles').rows;
  const arts = useTable('articles', (q) => q.order('created_at', { ascending: false }));
  const [m, setM] = useState({ name: '', emoji: '🙂', role: 'membre' });

  if (!me) return <p className="muted">Choisis un profil depuis l’accueil.</p>;
  if (!isAdmin) return <div className="card"><p>La vue {me.name} ne dispose pas des fonctions admin.</p></div>;

  const mine = arts.rows.filter((a) => a.owner_id === me.id);
  const open = reports.filter((r) => !r.resolved);
  const T = [['articles', '🛍️ Articles'], ['reports', `🔗 Signalements${open.length ? ' (' + open.length + ')' : ''}`], ...(isSuper ? [['badges', '🏷️ Pastilles'], ['theme', '🎨 Thème'], ['members', '👥 Membres']] : [])];
  return (
    <>
      <div className="row"><h1 style={{ flex: 1 }}>{me.emoji} Espace {me.name}</h1><a className="btn ghost" href="/">Retour à l’accueil</a></div>
      <p className="muted">Le code famille donne accès à toutes les vues, y compris les fonctions admin.</p>
      <div className="tabs">{T.map(([k, l]) => <button key={k} className="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'articles' && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', alignItems: 'start' }}>
          <ArticleForm me={me} badges={badges} />
          <div style={{ display: 'grid', gap: 10 }}>{mine.map((a) => <Row key={a.id} a={a} badges={badges} />)}{!mine.length && <p className="muted">Aucun article pour l’instant.</p>}</div>
        </div>
      )}
      {tab === 'reports' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {reports.map((r) => { const a = arts.rows.find((x) => x.id === r.article_id); return (
            <div className="card row" key={r.id}><span style={{ flex: 1 }}>{r.resolved ? '✅' : '🔗'} {a?.name || 'Article supprimé'} <small className="muted">{new Date(r.created_at).toLocaleString('fr-FR')}</small></span>
              {a && <a className="btn ghost" href={a.url} target="_blank" rel="noopener noreferrer">Tester ↗</a>}
              {!r.resolved && <button className="btn" onClick={() => runAdmin('link_reports', 'update', { resolved: true }, r.id)}>Résolu</button>}</div>); })}
          {!reports.length && <p className="muted">Aucun signalement 🎉</p>}
        </div>
      )}
      {tab === 'badges' && isSuper && <Badges badges={badges} />}
      {tab === 'theme' && isSuper && <Theme />}
      {tab === 'members' && isSuper && (
        <div>
          {profiles.map((p) => <div className="card row" key={p.id} style={{ marginBottom: 8 }}><span style={{ flex: 1 }}>{p.emoji} <b>{p.name}</b> — {p.role}</span></div>)}
          <div className="card row">
            <input style={{ width: 70 }} value={m.emoji} onChange={(e) => setM({ ...m, emoji: e.target.value })} />
            <input style={{ flex: 1 }} placeholder="Prénom" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} />
            <select style={{ width: 150 }} value={m.role} onChange={(e) => setM({ ...m, role: e.target.value })}><option value="membre">Membre</option><option value="admin">Admin</option></select>
            <button className="btn" onClick={async () => { if (!m.name) return; if (await runAdmin('profiles', 'insert', m)) setM({ ...m, name: '' }); }}>＋ Ajouter</button>
          </div>
          <p className="muted">Les profils admin sont accessibles après saisie du code famille. Toute personne qui connaît ce code peut utiliser leurs fonctions.</p>
        </div>
      )}
    </>
  );
}
