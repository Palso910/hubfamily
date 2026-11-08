'use client';
import { useEffect, useState } from 'react';

/** Affiche un toast depuis n'importe où : toast('message') */
export const toast = (m: string) => typeof window !== 'undefined' && window.dispatchEvent(new CustomEvent('hub-toast', { detail: m }));

export default function Toaster() {
  const [l, setL] = useState<{ id: number; m: string }[]>([]);
  useEffect(() => {
    const f = (e: any) => {
      const id = Date.now() + Math.random();
      setL((x) => [...x, { id, m: e.detail }]);
      setTimeout(() => setL((x) => x.filter((i) => i.id !== id)), 4500);
    };
    window.addEventListener('hub-toast', f);
    return () => window.removeEventListener('hub-toast', f);
  }, []);
  return <div className="toasts" aria-live="polite">{l.map((t) => <div key={t.id} className="toast">{t.m}</div>)}</div>;
}
