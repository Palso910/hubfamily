export const eur = (n: any) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
export const pct = (a: any) => (a.old_price && +a.old_price > +a.price ? Math.round((1 - +a.price / +a.old_price) * 100) : 0);
export const getSid = () => (typeof document === 'undefined' ? '' : document.cookie.match(/hub_sid=([^;]+)/)?.[1] || '');
export const imgUrl = (a: any) => (a.image_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/articles/${a.image_path}` : a.image_url || '');

/** Compression côté client avant envoi : max 1200 px, WebP qualité 0.82 */
export async function compress(file: File, max = 1200): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * r);
  c.height = Math.round(bmp.height * r);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/webp', 0.82));
}
