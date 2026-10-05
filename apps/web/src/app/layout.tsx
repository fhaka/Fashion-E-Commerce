import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { DemoBadge } from '@/components/demo/Demo';
import { Providers } from '@/components/layout/Providers';
import { SiteProvider } from '@/components/layout/SiteProvider';
import { SearchOverlay } from '@/components/layout/SearchOverlay';
import { Toaster } from '@/components/layout/Toaster';
import { deferRenderIfApiOffline } from '@/lib/buildGuard';
import { blend } from '@maison/shared';
import { getSiteConfig, getSiteSettings } from '@/lib/site';
import type { SiteSettings } from '@/lib/types';
import { SITE_URL } from '@/lib/utils';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const title = `${s.storeName} — ${s.tagline}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s | ${s.storeName}` },
    description: s.description,
    applicationName: s.storeName,
    openGraph: { type: 'website', siteName: s.storeName, locale: s.locale.replace('-', '_'), url: SITE_URL, title, description: s.description },
    twitter: { card: 'summary_large_image', title: s.storeName, description: s.description },
    robots: { index: true, follow: true },
    alternates: { canonical: '/' },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const s = await getSiteSettings();
  return { themeColor: s.theme.ink, width: 'device-width', initialScale: 1 };
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Brand colours from Admin → Settings, applied over the design tokens in globals.css. */
function themeStyle({ ink, bone, accent, accentDark }: SiteSettings['theme']) {
  if (![ink, bone, accent, accentDark].every((c) => HEX.test(c))) return '';
  return `:root{--color-ink:${ink};--color-ink-soft:${blend(bone, ink, 0.07)};--color-bone:${bone};--color-camel:${accent};--color-camel-dark:${accentDark}}`;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await deferRenderIfApiOffline();
  const site = await getSiteConfig();
  return (
    <html lang={site.settings.locale} className={`${inter.variable} ${cormorant.variable}`}>
      <head>
        <style id="brand-theme">{themeStyle(site.settings.theme)}</style>
      </head>
      <body>
        <a href="#main" className="sr-only z-[70] bg-ink px-4 py-3 text-bone focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
          Skip to content
        </a>
        <Providers>
          <SiteProvider config={site}>
            {children}
            <CartDrawer />
            <SearchOverlay />
            <Toaster />
            <DemoBadge />
          </SiteProvider>
        </Providers>
      </body>
    </html>
  );
}
