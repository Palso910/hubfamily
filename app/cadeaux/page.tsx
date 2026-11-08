'use client';
import { useTable } from '@/lib/useTable';
import { eur, imgUrl } from '@/lib/utils';
import Badge from '@/components/Badge';

/** Liste de cadeaux imprimable (PDF via « Imprimer ») et partageable sur WhatsApp */
export default function Cadeaux() {
  const a = useTable('articles', (q) => q.neq('status', 'removed').eq('gifted', false)).rows;
  const b = useTable('badges').rows;
  const rank = (x: any) => b.find((y) => y.id === x.badge_id)?.rank ?? 99;
  const list = [...a].sort((x, y) => rank(x) - rank(y));
  const total = list.reduce((s, x) => s + Number(x.price), 0);
  const txt = '🎁 Liste de cadeaux\n' + list.map((x) => `• ${x.name} — ${eur(x.price)}\n${x.url}`).join('\n') + `\nTotal : ${eur(total)}`;
  return (
    <section className="card">
      <h1>🎁 Liste de cadeaux</h1>
      <div className="row noprint">
        <button className="btn" onClick={() => window.print()}>🖨️ Imprimer / PDF</button>
        <a className="btn ghost" href={'https://wa.me/?text=' + encodeURIComponent(txt)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </div>
      <ul className="gift" style={{ padding: 0 }}>
        {list.map((x) => (
          <li key={x.id}>{imgUrl(x) && <img src={imgUrl(x)} alt="" />}<span style={{ flex: 1 }}><b>{x.name}</b><br /><Badge b={b.find((y) => y.id === x.badge_id)} /></span><b>{eur(x.price)}</b></li>
        ))}
      </ul>
      <h2>Total : {eur(total)}</h2>
    </section>
  );
}
