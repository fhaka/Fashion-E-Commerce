'use client';

import { Heart, LogOut, MapPin, Package, User, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/stores/auth';

const NAV = [
  { href: '/account', label: 'Overview', icon: LayoutGrid, exact: true },
  { href: '/account/orders', label: 'Orders', icon: Package },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/profile', label: 'Profile & security', icon: User },
  { href: '/wishlist', label: 'Wishlist', icon: Heart },
];

/** Client-side guard + navigation for all /account pages. Data is protected server-side by the API. */
export function AccountShell({ children }: { children: ReactNode }) {
  const { user, status, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === 'guest') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  if (status !== 'authenticated' || !user) {
    return (
      <div className="container-site py-16" aria-busy="true">
        <div className="skeleton mb-4 h-3 w-32" />
        <div className="skeleton mb-12 h-12 w-72" />
        <div className="grid gap-10 lg:grid-cols-[14rem_1fr]">
          <div className="skeleton h-56" />
          <div className="skeleton h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="container-site pt-10 pb-(--spacing-section) lg:pt-14">
      <header className="mb-10 lg:mb-14">
        <p className="eyebrow mb-3 text-stone-500">My account</p>
        <h1 className="font-display text-display-sm font-light">Hello, {user.firstName}</h1>
      </header>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Account" className="min-w-0">
          <ul className="no-scrollbar -mx-(--spacing-gutter) flex gap-2 overflow-x-auto px-(--spacing-gutter) lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 border px-4 py-3 text-sm whitespace-nowrap transition-colors lg:border-0 lg:border-l-2',
                      active ? 'border-ink bg-bone lg:bg-transparent lg:font-medium' : 'border-stone-200 text-stone-600 hover:text-ink lg:border-transparent',
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.4} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {user.role === 'ADMIN' && (
              <li>
                <Link href="/admin" className="flex items-center gap-3 border border-stone-200 px-4 py-3 text-sm whitespace-nowrap text-stone-600 hover:text-ink lg:border-0 lg:border-l-2 lg:border-transparent">
                  <LayoutGrid className="h-4 w-4" strokeWidth={1.4} />
                  Admin dashboard
                </Link>
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.replace('/');
                }}
                className="flex w-full items-center gap-3 border border-stone-200 px-4 py-3 text-sm whitespace-nowrap text-stone-600 hover:text-ink lg:border-0 lg:border-l-2 lg:border-transparent"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.4} />
                Sign out
              </button>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
