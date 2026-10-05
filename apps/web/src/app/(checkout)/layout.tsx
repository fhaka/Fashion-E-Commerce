import { ArrowLeft, Lock } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Wordmark } from '@/components/layout/Wordmark';
import { getSiteSettings } from '@/lib/site';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } };

/** Distraction-free checkout chrome: no navigation, search or footer links competing for attention. */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <div className="min-h-svh bg-paper">
      <header className="border-b border-stone-200">
        <div className="container-site grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-20">
          <Link href="/cart" className="flex items-center gap-2 text-[0.68rem] tracking-[0.14em] text-stone-600 uppercase hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> <span className="max-sm:sr-only">Back to bag</span>
          </Link>
          <Link href="/" aria-label={`${settings.storeName} — home`} className="flex justify-center">
            <Wordmark className="text-[1.6rem] tracking-[0.32em] lg:text-[1.8rem]" />
          </Link>
          <p className="flex items-center justify-end gap-2 text-[0.68rem] tracking-[0.14em] text-stone-600 uppercase">
            <Lock className="h-3.5 w-3.5" /> <span className="max-sm:sr-only">Secure checkout</span>
          </p>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="border-t border-stone-200 py-8">
        <div className="container-site flex flex-wrap justify-between gap-4 text-xs text-stone-500">
          <p>
            © {new Date().getFullYear()} {settings.legalName}
          </p>
          <nav className="flex gap-5" aria-label="Legal">
            <Link href="/shipping-returns" className="hover:text-ink">
              Shipping & returns
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
