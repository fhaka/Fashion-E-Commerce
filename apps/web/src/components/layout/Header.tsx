'use client';

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { hasHero as routeHasHero } from '@/lib/routes';
import type { CategoryNode, Collection } from '@/lib/types';
import { cn, EASE, pluralize } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { useCart } from '@/stores/cart';
import { useUi } from '@/stores/ui';
import { useWishlist } from '@/stores/wishlist';
import { MegaMenu, type NavItem } from './MegaMenu';
import { MobileMenu } from './MobileMenu';
import { useSite } from './SiteProvider';
import { Announcements, Wordmark } from './Wordmark';

export function Header({ categories, collections }: { categories: CategoryNode[]; collections: Collection[] }) {
  const pathname = usePathname();
  const hasHero = routeHasHero(pathname);
  const { storeName, announcements } = useSite();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { scrollY } = useScroll();

  const itemCount = useCart((s) => s.cart.itemCount);
  const wishCount = useWishlist((s) => s.ids.length);
  const user = useAuth((s) => s.user);
  const { openCart, openSearch, setMenu, menuOpen, cartOpen, searchOpen, heroTone, setHeaderHidden } = useUi();

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    // Hide on scroll down, reveal on scroll up (never while a menu is open).
    setHidden(y > 320 && y > prev && !active && !menuOpen);
  });

  const isHidden = hidden && !cartOpen && !searchOpen;
  useEffect(() => setHeaderHidden(isHidden), [isHidden, setHeaderHidden]);

  useEffect(() => {
    setActive(null);
    setMenu(false);
  }, [pathname, setMenu]);

  const nav: NavItem[] = [
    { label: 'New In', href: '/shop?isNew=true' },
    ...categories.map((c) => ({ label: c.name, href: `/category/${c.slug}`, category: c })),
    { label: 'Collections', href: '/collections', collections },
    { label: 'Sale', href: '/shop?onSale=true', accent: true },
  ];

  const solid = !hasHero || scrolled || !!active || menuOpen;
  const open = (label: string | null) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActive(label);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setActive(null), 120);
  };
  const activeItem = nav.find((n) => n.label === active && (n.category || n.collections));

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-40"
        animate={{ y: isHidden ? '-100%' : '0%' }}
        transition={{ duration: 0.5, ease: EASE }}
        onMouseLeave={scheduleClose}
      >
        {/* Announcement bar */}
        <div
          className={cn(
            'overflow-hidden bg-ink text-bone transition-[height] duration-500 ease-luxe',
            scrolled || announcements.length === 0 ? 'h-0' : 'h-9',
          )}
        >
          <Announcements />
        </div>

        <div
          className={cn(
            'relative border-b transition-colors duration-500 ease-luxe',
            solid
              ? 'border-stone-200 bg-paper/95 text-ink backdrop-blur-md'
              : cn('border-transparent bg-transparent', heroTone === 'light' ? 'text-ink' : 'text-bone'),
          )}
        >
          <div className="container-site grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-[4.5rem]">
            {/* Left: nav (desktop) / burger (mobile) */}
            <div className="flex items-center">
              <button
                type="button"
                className="-ml-2 p-2 xl:hidden"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                onClick={() => setMenu(true)}
              >
                <Menu className="h-5 w-5" strokeWidth={1.4} />
              </button>
              <nav aria-label="Main" className="hidden xl:block">
                <ul className="flex items-center gap-5 2xl:gap-7">
                  {nav.map((item) => {
                    const hasPanel = !!(item.category || item.collections);
                    return (
                      <li key={item.label} onMouseEnter={() => (hasPanel ? open(item.label) : open(null))}>
                        <Link
                          href={item.href}
                          className={cn('link-underline py-1 text-[0.7rem] tracking-[0.14em] whitespace-nowrap uppercase 2xl:text-[0.72rem] 2xl:tracking-[0.16em]', item.accent && 'text-sale')}
                          data-active={active === item.label}
                          aria-haspopup={hasPanel || undefined}
                          aria-expanded={hasPanel ? active === item.label : undefined}
                          onFocus={() => hasPanel && open(item.label)}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            {/* Logo */}
            <Link href="/" aria-label={`${storeName} — home`} className="flex justify-center">
              <Wordmark className="text-[1.65rem] tracking-[0.32em] lg:text-[1.9rem]" logoClassName="h-8 lg:h-9" />
            </Link>

            {/* Right: actions */}
            <div className="flex items-center justify-end gap-1 sm:gap-2">
              {user?.role === 'ADMIN' && (
                <Link href="/admin" className="mr-2 hidden border border-current px-2.5 py-1 text-[0.62rem] tracking-[0.16em] uppercase md:block">
                  Admin
                </Link>
              )}
              <button type="button" onClick={openSearch} className="p-2" aria-label="Search">
                <Search className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.4} />
              </button>
              <Link href={user ? '/account' : '/login'} className="hidden p-2 sm:block" aria-label={user ? 'Your account' : 'Sign in'}>
                <User className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.4} />
              </Link>
              <Link href="/wishlist" className="relative hidden p-2 sm:block" aria-label={`Wishlist, ${pluralize(wishCount, 'item')}`}>
                <Heart className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.4} />
                <CountBadge count={wishCount} />
              </Link>
              <button type="button" onClick={openCart} className="relative -mr-2 p-2" aria-label={`Shopping bag, ${pluralize(itemCount, 'item')}`}>
                <ShoppingBag className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.4} />
                <CountBadge count={itemCount} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {activeItem && (
              <MegaMenu key="mega" item={activeItem} onMouseEnter={() => open(activeItem.label)} onNavigate={() => setActive(null)} />
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Dim the page while the mega menu is open */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            className="fixed inset-0 z-30 hidden bg-ink/25 xl:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onMouseEnter={scheduleClose}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <MobileMenu nav={nav} />
    </>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className="absolute top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-camel px-1 text-[0.6rem] font-semibold text-paper tabular-nums"
          aria-hidden
        >
          {count > 99 ? '99+' : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
