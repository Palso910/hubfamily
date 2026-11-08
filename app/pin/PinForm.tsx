'use client';
import { useState } from 'react';
import Logo from '@/components/Logo';

/** Écran du code famille : grand champ numérique, cible tactile XL */
export default function PinForm({ title, msg }: { title: string; msg: string }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [bad, setBad] = useState(0);
  const [busy, setBusy] = useState(false);
  const appendDigit = (digit: string) => setPin((value) => value.length < 6 ? value + digit : value);
  const eraseDigit = () => setPin((value) => value.slice(0, -1));

  async function go(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/pin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin }) });
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        setErr(`Le serveur a répondu une page inattendue (${r.status}). Le site n'est peut-être pas à jour : redéploie-le puis réessaie.`);
        return;
      }
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        window.location.assign('/');
        return;
      }
      setPin(''); setBad((b) => b + 1);
      if (r.status === 429) setErr(`Trop d'essais, réessaie dans ${j.wait} s ⏳`);
      else if (r.status === 500) setErr(j.error || 'Erreur serveur, réessaie plus tard.');
      else setErr(`Code incorrect : il reste ${j.left} essai(s)`);
    } catch (ex: unknown) {
      const message = ex instanceof Error ? ex.message : 'erreur réseau';
      setErr(`Connexion impossible au serveur (${message}).`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="pin pin-screen" onSubmit={go}>
      <div className="pin-brand"><Logo /><span>Hub Courses <b>💛</b></span></div>
      <div className="pin-content">
        <div className="pin-emblem" aria-hidden="true">💛</div>
        <h1>{title === 'Entre le code famille' ? 'Bienvenue dans notre petite boutique' : title}</h1>
        <p className="muted">{msg}</p>
        <label className="pin-label" htmlFor="family-pin">NOTRE CODE À 6 CHIFFRES</label>
        <div className={'pin-dots' + (bad ? ' shake' : '')} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => <span key={index} className={pin.length > index ? 'filled' : ''} />)}
        </div>
        <input
          id="family-pin"
          key={bad}
          className="pin-access-input"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          aria-label="Code famille"
        />
        <p className="pin-hint">Trois petits essais, ce n’est pas grave 💛<br /><span>Prends ton temps, ou demande le code à Paul.</span></p>
        {err && <p role="alert" className="pin-error">{err}</p>}
        <div className="pin-keypad" aria-label="Clavier du code famille">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'heart', '0', 'delete'].map((key) => (
            key === 'heart'
              ? <button key={key} type="submit" className="pin-key pin-submit" aria-label={busy ? 'Vérification en cours' : 'Valider le code'} disabled={pin.length < 4 || busy}>💛</button>
              : key === 'delete'
                ? <button key={key} type="button" className="pin-key" aria-label="Effacer le dernier chiffre" onClick={eraseDigit}>⌫</button>
                : <button key={key} type="button" className="pin-key" onClick={() => appendDigit(key)}>{key}</button>
          ))}
        </div>
        <p className="pin-status" aria-live="polite">{busy ? 'Vérification…' : ''}</p>
      </div>
    </form>
  );
}
