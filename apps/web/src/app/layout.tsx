import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Providers } from '@/components/layout/Providers';
import { SearchOverlay } from '@/components/layout/SearchOverlay';
import { Toaster } from '@/components/layout/Toaster';
import { deferRenderIfApiOffline } from '@/lib/buildGuard';
import { SITE_NAME, SITE_URL } from '@/lib/utils';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const description =
  'Maison — considered luxury clothing, cut in our Paris atelier from the finest natural fibres. Outerwear, tailoring, cashmere and leather goods made to be worn for decades.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} — Modern Luxury Clothing`, template: `%s | ${SITE_NAME}` },
  description,
  applicationName: SITE_NAME,
  keywords: ['luxury clothing', 'cashmere', 'wool coats', 'tailoring', 'leather goods', 'designer fashion'],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: SITE_URL,
    title: `${SITE_NAME} — Modern Luxury Clothing`,
    description,
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: '#0e0e0e',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await deferRenderIfApiOffline();
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body>
        <a href="#main" className="sr-only z-[70] bg-ink px-4 py-3 text-bone focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
          Skip to content
        </a>
        <Providers>
          {children}
          <CartDrawer />
          <SearchOverlay />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
