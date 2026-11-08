// Signature HMAC du cookie PIN (Web Crypto : fonctionne en middleware Edge ET en route Node)
const enc = new TextEncoder();
const secret = () => (process.env.SITE_PIN || '') + '|' + (process.env.SUPABASE_SERVICE_ROLE_KEY || '') + '|hub';

async function hmac(msg: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return Array.from(new Uint8Array(s)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparaison à temps constant */
export function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Jeton "expiration.signature" valable `days` jours */
export async function makeToken(days = 90) {
  const exp = Date.now() + days * 864e5;
  return exp + '.' + (await hmac(String(exp)));
}

export async function checkToken(t?: string) {
  if (!t || !process.env.SITE_PIN) return false;
  const [e, s] = t.split('.');
  if (!e || !s || +e < Date.now()) return false;
  return safeEq(s, await hmac(e));
}

export async function makeViewToken(profileId: string, days = 90) {
  const exp = Date.now() + days * 864e5;
  const payload = `${profileId}.${exp}`;
  return `${payload}.${await hmac(`view:${payload}`)}`;
}

export async function checkViewToken(t?: string) {
  if (!t) return null;
  const [profileId, expiry, signature] = t.split('.');
  if (!profileId || !expiry || !signature || Number(expiry) < Date.now()) return null;
  return safeEq(signature, await hmac(`view:${profileId}.${expiry}`)) ? profileId : null;
}
