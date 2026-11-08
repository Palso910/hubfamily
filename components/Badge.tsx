import { onColor } from '@/lib/palettes';

/** Pastille d'importance personnalisée (libellé + emoji + couleur) */
export default function Badge({ b }: { b: any }) {
  if (!b) return null;
  return <span className="pill" style={{ background: b.color, color: onColor(b.color) }}>{b.emoji} {b.label}</span>;
}
