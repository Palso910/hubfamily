'use client';
import { useState } from 'react';
import { sb } from '@/lib/supabase';
import { eur } from '@/lib/utils';
import Badge from './Badge';
import { toast } from './Toaster';

const LBL: any = { pending: '⏳ En attente', approved: '✅ Validée', refused: '❌ Refusée' };

/** Hub de requêtes : envoyer, valider/refuser en 1 tap (sauf son auteur), historique filtrable */
export default function Requests({ requests, profiles, badges, me }: any) {
  const [who, setWho] = useState(''), [st, setSt] = useState('');
  const [show, setShow] = useState(false);
  const [f, setF] = useState<any>({ title: '', event_date: '', place: '', amount: '', description: '', badge_id: '' });
  const [note, setNote] = useState<Record<string, string>>({});
  const bm = Object.fromEntries(badges.map((b: any) => [b.id, b]));
  const pm = Object.fromEntries(profiles.map((p: any) => [p.id, p]));

  async function send() {
    if (!f.title.trim() || !me) return toast('Il manque un titre 🙂');
    const { error } = await sb.from('requests').insert({
      requester_id: me.id, title: f.title.trim(), description: f.description || null, event_date: f.event_date || null,
      place: f.place || null, amount: f.amount === '' ? null : +f.amount, badge_id: f.badge_id || null,
    });
    if (error) return toast('Erreur : ' + error.message);
    setF({ title: '', event_date: '', place: '', amount: '', description: '', badge_id: '' }); setShow(false); toast('Demande envoyée ✨');
  }
  async function decide(r: any, status: string) {
    const { error } = await sb.from('requests').update({ status, decided_by: me.id, decision_note: note[r.id] || null }).eq('id', r.id);
    if (error) toast('Erreur : ' + error.message);
  }
  const list = requests.filter((r: any) => (!who || r.requester_id === who) && (!st || r.status === st));
  const count = (status: string) => requests.filter((request: any) => request.status === status).length;

  return (
    <section className="requests-page">
      <div className="section-heading requests-heading">
        <span className="hero-kicker"><span /> ON EN PARLE ? / EN FAMILLE, TOUT SIMPLEMENT</span>
        <h1>Les petits projets de la famille</h1>
        <p className="muted">Une sortie, une idée, un coup de pouce. Ici, tout le monde a sa place — même Maman.</p>
        <button className="btn request-create" onClick={() => setShow(!show)}>＋ Nouvelle demande</button>
        <div className="request-summary" aria-label="Résumé des demandes">
          <span className="request-summary-pending">⏳ {count('pending')} en attente</span>
          <span className="request-summary-approved">✅ {count('approved')} validée{count('approved') === 1 ? '' : 's'}</span>
          <span className="request-summary-refused">❌ {count('refused')} refusée{count('refused') === 1 ? '' : 's'}</span>
        </div>
      </div>
      <div className="row" style={{ margin: '8px 0' }}>
        <select style={{ flex: 1 }} value={who} onChange={(e) => setWho(e.target.value)} aria-label="Personne"><option value="">Tout le monde</option>{profiles.map((p: any) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}</select>
        <select style={{ flex: 1 }} value={st} onChange={(e) => setSt(e.target.value)} aria-label="Statut"><option value="">Historique complet</option>{Object.entries(LBL).map(([k, v]: any) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      {show && (
        <div className="card" style={{ marginBottom: 14 }}>
          <label>Titre</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Sortie potes — ciné + resto" />
          <div className="row"><div style={{ flex: 1 }}><label>Date</label><input type="date" value={f.event_date} onChange={(e) => setF({ ...f, event_date: e.target.value })} /></div>
            <div style={{ flex: 1 }}><label>Montant (€)</label><input type="number" min="0" step="0.5" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div></div>
          <label>Lieu</label><input value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} />
          <label>Infos</label><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <label>Importance</label>
          <div className="row">{badges.map((b: any) => <button key={b.id} className={'tab'} aria-selected={f.badge_id === b.id} onClick={() => setF({ ...f, badge_id: f.badge_id === b.id ? '' : b.id })}>{b.emoji} {b.label}</button>)}</div>
          <p><button className="btn" onClick={send}>Envoyer</button></p>
        </div>
      )}
      <div className="section-heading"><h2>À discuter ensemble</h2></div>
      <div className="grid">
        {list.map((r: any) => {
          const p = pm[r.requester_id], d = pm[r.decided_by];
          return (
            <article className="card request-card" key={r.id}>
              <div className="row"><Badge b={bm[r.badge_id]} /><span className="pill" style={{ background: 'color-mix(in srgb,var(--text) 14%,transparent)' }}>{LBL[r.status]}</span></div>
              <h3>{r.title}</h3>
              <p style={{ margin: '2px 0' }}><b>Demande de {p?.name} {p?.emoji}</b></p>
              <p className="muted" style={{ margin: '2px 0' }}>{[r.event_date && new Date(r.event_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }), r.place].filter(Boolean).join(' · ')}</p>
              {r.amount != null && <div className="price">{eur(r.amount)}</div>}
              {r.description && <p>{r.description}</p>}
              {r.status !== 'pending' && <p className="muted">{d?.name} : {r.decision_note || (r.status === 'approved' ? 'OK 👍' : 'Non, désolé')}</p>}
              {r.status === 'pending' && me && r.requester_id !== me.id && (
                <>
                  <input placeholder="Un mot ? (optionnel) « D'accord mais rentre avant 23h 😄 »" value={note[r.id] || ''} onChange={(e) => setNote({ ...note, [r.id]: e.target.value })} />
                  <div className="row" style={{ marginTop: 8 }}><button className="btn ok" onClick={() => decide(r, 'approved')}>✅ Valider</button><button className="btn ko" onClick={() => decide(r, 'refused')}>❌ Refuser</button></div>
                </>
              )}
            </article>
          );
        })}
      </div>
      {!list.length && <p className="muted">Aucune demande ici.</p>}
    </section>
  );
}
