'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMe, useTable } from '@/lib/useTable';
import { themeVars } from '@/lib/palettes';
import Logo from './Logo';

/** En-tête + thème en direct (Realtime sur site_settings) + bannière cookies minimale */
export default function Header({ init }: { init: any }) {
  const { rows } = useTable('site_settings');
  const { me, isAdmin } = useMe();
  const s = rows[0] || init || {};
  const path = usePathname();
  const router = useRouter();
  const [ck, setCk] = useState(true);
  const [activeSection, setActiveSection] = useState('articles');

  // Applique le thème instantanément chez tout le monde, sans rechargement
  useEffect(() => {
    Object.entries(themeVars(s)).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  }, [JSON.stringify(s.custom), s.palette]);
  useEffect(() => setCk(/hub_ck=1/.test(document.cookie)), []);
  useEffect(() => {
    const onSectionChange = (event: Event) => setActiveSection((event as CustomEvent<string>).detail);
    window.addEventListener('hub-tab-change', onSectionChange);
    const initialSection = new URLSearchParams(window.location.search).get('section');
    if (initialSection) setActiveSection(initialSection);
    return () => window.removeEventListener('hub-tab-change', onSectionChange);
  }, []);

  const lock = async () => { await fetch('/api/pin', { method: 'DELETE' }); router.replace('/pin'); router.refresh(); };
  const onPin = path === '/pin';
  const sections = [['articles', 'Accueil'], ['carts', 'Paniers'], ['requests', 'Demandes'], ['shops', 'Boutiques']];
  const goToSection = (section: string) => {
    if (path !== '/') {
      router.push(`/?section=${section}`);
      return;
    }
    window.dispatchEvent(new CustomEvent('hub-tab-change', { detail: section }));
  };
  return (
    <>
      <header className={'top noprint' + (onPin ? ' top-pin' : '')}>
        <Link href="/" className="brand">{s.logo_url ? <img src={s.logo_url} alt="" /> : <Logo />}<span>{s.site_name} <b className="brand-heart">💛</b></span></Link>
        {!onPin && (
          <nav>
            <div className="main-nav" aria-label="Navigation principale">
              {sections.map(([key, label]) => (
                <button key={key} className={'nav-link' + (activeSection === key ? ' active' : '')} onClick={() => { setActiveSection(key); goToSection(key); }}>{label}</button>
              ))}
            </div>
            <Link className="btn ghost" href="/cadeaux">🎁 Cadeaux</Link>
            {isAdmin && me && <Link className="btn ghost" href="/admin">⚙️ {me.name}</Link>}
            <button className="btn ghost" onClick={lock} title="Saisir à nouveau le code pour changer de profil" aria-label="Changer de profil">🔒</button>
          </nav>
        )}
      </header>
      {!ck && (
        <div className="card cookie noprint" role="dialog">
          <span>Cookies techniques uniquement (code famille, panier). Aucun suivi.</span>
          <button className="btn" onClick={() => { document.cookie = 'hub_ck=1;path=/;max-age=31536000'; setCk(true); }}>OK</button>
        </div>
      )}
    </>
  );
}
