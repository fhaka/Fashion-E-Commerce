'use client';

import {
  BarChart3,
  Boxes,
  ExternalLink,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  Layers,
  LogOut,
  Mail,
  Menu,
  MessageSquareQuote,
  Package,
  Palette,
  ShoppingBag,
  Star,
  Tag,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { ButtonLink } from '../ui/Button';

const NAV: { group: string; items: { href: string; label: string; icon: typeof Package; exact?: boolean }[] }[] = [
  {
    group: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/admin/reports', label: 'Sales reports', icon: BarChart3 },
    ],
  },
  {
    group: 'Sales',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/coupons', label: 'Coupons', icon: Tag },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Products', icon: Package },
      { href: '/admin/featured', label: 'Featured', icon: Star },
      { href: '/admin/categories', label: 'Categories', icon: FolderTree },
      { href: '/admin/collections', label: 'Collections', icon: Layers },
      { href: '/admin/attributes', label: 'Sizes & colours', icon: Palette },
      { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
    ],
  },
  {
    group: 'Content',
    items: [
      { href: '/admin/banners', label: 'Homepage banners', icon: ImageIcon },
      { href: '/admin/reviews', label: 'Reviews', icon: MessageSquareQuote },
      { href: '/admin/newsletter', label: 'Newsletter & messages', icon: Mail },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, status, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === 'guest') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);
  useEffect(() => setOpen(false), [pathname]);

  if (status !== 'authenticated' || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-stone-100" aria-busy="true">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink border-t-transparent" />
      </div>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-stone-100 px-6 text-center">
        <p className="font-display text-4xl font-light">Staff only</p>
        <p className="max-w-sm text-stone-600">Your account does not have access to the Maison admin. If you think this is a mistake, contact your administrator.</p>
        <ButtonLink href="/">Back to the store</ButtonLink>
      </div>
    );
  }

  const nav = (
    <nav aria-label="Admin" className="space-y-7 px-3 py-6">
      {NAV.map((g) => (
        <div key={g.group}>
          <p className="mb-2 px-3 text-[0.62rem] tracking-[0.18em] text-bone/40 uppercase">{g.group}</p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn('flex items-center gap-3 px-3 py-2 text-sm transition-colors', active ? 'bg-bone/10 text-bone' : 'text-bone/65 hover:bg-bone/5 hover:text-bone')}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-svh bg-stone-100/60 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-svh flex-col overflow-y-auto bg-ink text-bone lg:flex">
        <Link href="/admin" className="block border-b border-bone/10 px-6 py-6 font-display text-2xl tracking-[0.3em] uppercase">
          Maison
          <span className="mt-1 block font-sans text-[0.6rem] tracking-[0.2em] text-bone/50">Admin</span>
        </Link>
        <div className="flex-1">{nav}</div>
      </aside>

      {/* Sidebar (mobile drawer) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-ink text-bone">
            <div className="flex items-center justify-between border-b border-bone/10 px-6 py-5">
              <span className="font-display text-2xl tracking-[0.3em] uppercase">Maison</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-stone-200 bg-paper/95 px-4 backdrop-blur sm:px-8">
          <button type="button" className="-ml-1 p-1 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-5 text-sm">
            <Link href="/" target="_blank" className="flex items-center gap-1.5 text-stone-600 hover:text-ink">
              View store <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <span className="hidden text-stone-500 sm:inline">
              {user.firstName} {user.lastName}
            </span>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.replace('/login');
              }}
              className="flex items-center gap-1.5 text-stone-600 hover:text-ink"
            >
              <LogOut className="h-4 w-4" /> <span className="max-sm:sr-only">Sign out</span>
            </button>
          </div>
        </header>
        <main id="main" className="px-4 py-8 sm:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
