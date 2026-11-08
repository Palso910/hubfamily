// 23 palettes prédéfinies (validées AA par script) + palette libre « custom ».
// Format : id: [nom, fond, cartes, texte, texte discret, bouton A, bouton B, accent]
export type Pal = { bg: string; card: string; text: string; muted: string; cta1: string; cta2: string; accent: string };
const RAW: Record<string, string[]> = {
  'sunset-or-noir': ['Sunset Or Noir', '#0A0A0A', '#161616', '#FAFAFA', '#A3A3A3', '#F97316', '#EF4444', '#F5C518'],
  'minuit-bleu': ['Minuit Bleu', '#0B1220', '#131C30', '#F1F5F9', '#94A3B8', '#3B82F6', '#6366F1', '#38BDF8'],
  foret: ['Forêt', '#08140D', '#102019', '#ECFDF5', '#9CC9AE', '#22C55E', '#14B8A6', '#FACC15'],
  'rose-nuit': ['Rose Nuit', '#170A12', '#24121D', '#FDF2F8', '#D1A3BC', '#EC4899', '#F43F5E', '#FBBF24'],
  'violet-royal': ['Violet Royal', '#120A1F', '#1D1233', '#F5F3FF', '#B4A5D6', '#8B5CF6', '#D946EF', '#FCD34D'],
  ocean: ['Océan', '#04141A', '#0B2530', '#ECFEFF', '#8FC1CC', '#06B6D4', '#3B82F6', '#FDE047'],
  lave: ['Lave', '#1A0808', '#2A1010', '#FEF2F2', '#D1A0A0', '#EF4444', '#F97316', '#FDE68A'],
  'menthe-noir': ['Menthe Noir', '#07100E', '#0F1D1A', '#F0FDFA', '#8CBFB5', '#2DD4BF', '#10B981', '#FDE68A'],
  charbon: ['Charbon', '#121212', '#1E1E1E', '#F5F5F5', '#A8A8A8', '#D4D4D4', '#A3A3A3', '#FACC15'],
  cuivre: ['Cuivre', '#140D08', '#221710', '#FFF7ED', '#C9A98F', '#F97316', '#EA580C', '#FCD34D'],
  cyber: ['Cyber', '#0A0A14', '#14142A', '#E0E7FF', '#9AA5E0', '#22D3EE', '#A855F7', '#F0ABFC'],
  olive: ['Olive', '#11130A', '#1C2010', '#F7FEE7', '#B5C28A', '#84CC16', '#65A30D', '#FDE047'],
  bordeaux: ['Bordeaux', '#1A0A10', '#2B1018', '#FFF1F2', '#D5A0AC', '#F43F5E', '#FB7185', '#FCD34D'],
  arctique: ['Arctique', '#0A1218', '#12202B', '#F0F9FF', '#9DB8C9', '#0EA5E9', '#38BDF8', '#A5F3FC'],
  mandarine: ['Mandarine', '#150C04', '#231609', '#FFFBEB', '#D2B48C', '#F59E0B', '#F97316', '#FDE047'],
  prune: ['Prune', '#150816', '#231126', '#FDF4FF', '#C9A3CC', '#C026D3', '#9333EA', '#FDE68A'],
  ardoise: ['Ardoise', '#0F1419', '#1A222B', '#F8FAFC', '#9AA9BA', '#94A3B8', '#CBD5E1', '#FBBF24'],
  jade: ['Jade', '#06130F', '#0E211B', '#ECFDF5', '#8CC4B0', '#059669', '#0D9488', '#FDE047'],
  aube: ['Aube (clair)', '#FFF7ED', '#FFFFFF', '#1C1917', '#57534E', '#F97316', '#EF4444', '#B45309'],
  creme: ['Crème (clair)', '#FAF7F2', '#FFFFFF', '#1F2937', '#4B5563', '#2563EB', '#7C3AED', '#B45309'],
  'rose-poudre': ['Rose Poudré (clair)', '#FFF1F2', '#FFFFFF', '#1F1F23', '#52525B', '#E11D48', '#DB2777', '#B45309'],
  'menthe-clair': ['Menthe (clair)', '#F0FDF4', '#FFFFFF', '#14231A', '#4B5E52', '#16A34A', '#0D9488', '#A16207'],
  'ciel-clair': ['Ciel (clair)', '#F0F9FF', '#FFFFFF', '#0F172A', '#475569', '#0369A1', '#4338CA', '#A16207'],
};
export const PAL: Record<string, Pal> = {};
export const PALETTES = Object.entries(RAW).map(([id, [name, bg, card, text, muted, cta1, cta2, accent]]) => {
  PAL[id] = { bg, card, text, muted, cta1, cta2, accent };
  return { id, name, ...PAL[id] };
});

export const lum = (h: string) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrast = (a: string, b: string) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** Noir ou blanc, selon le meilleur contraste minimum sur les couleurs données */
export const onColor = (...bg: string[]) => {
  const w = Math.min(...bg.map((c) => contrast(c, '#FFFFFF'))), k = Math.min(...bg.map((c) => contrast(c, '#000000')));
  return k >= w ? '#000000' : '#FFFFFF';
};
/** Indicateur de contraste (AA = 4.5) pour la palette libre */
export const checks = (p: Pal): [string, number][] => [
  ['Texte / fond', contrast(p.text, p.bg)],
  ['Texte / cartes', contrast(p.text, p.card)],
  ['Texte discret / cartes', contrast(p.muted, p.card)],
  ['Accent / cartes', contrast(p.accent, p.card)],
  ['Bouton (texte auto)', Math.min(contrast(onColor(p.cta1, p.cta2), p.cta1), contrast(onColor(p.cta1, p.cta2), p.cta2))],
];

/** Variables CSS injectées sur <html> à partir de site_settings */
export function themeVars(s: any): Record<string, string> {
  const p: Pal = s?.palette === 'custom' ? { ...PAL['sunset-or-noir'], ...(s.custom || {}) } : PAL[s?.palette] || PAL['sunset-or-noir'];
  return {
    '--bg': p.bg, '--card': p.card, '--text': p.text, '--muted': p.muted,
    '--cta1': p.cta1, '--cta2': p.cta2, '--accent': p.accent,
    '--on-cta': onColor(p.cta1, p.cta2), '--on-accent': onColor(p.accent),
  };
}
