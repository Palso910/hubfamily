import './globals.css';
import type { Metadata, Viewport } from 'next';
import Header from '@/components/Header';
import Toaster from '@/components/Toaster';
import { themeVars } from '@/lib/palettes';
import { serverSettings } from '@/lib/server';

export const dynamic = 'force-dynamic';
export const viewport: Viewport = { themeColor: '#0A0A0A', width: 'device-width', initialScale: 1 };
export async function generateMetadata(): Promise<Metadata> {
  const s = await serverSettings();
  return { title: s.site_name, manifest: '/manifest.webmanifest', icons: { icon: '/icon-192.png', apple: '/icon-192.png' } };
}

export default async function Root({ children }: { children: React.ReactNode }) {
  const s = await serverSettings();
  return (
    <html lang="fr" style={themeVars(s) as any}>
      <body>
        <Header init={s} />
        <main className="wrap">{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
