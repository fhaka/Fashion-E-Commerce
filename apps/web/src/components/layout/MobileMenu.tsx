'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cn, EASE } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { useUi } from '@/stores/ui';
import { Drawer } from '../ui/Drawer';
import type { NavItem } from './MegaMenu';

export function MobileMenu({ nav }: { nav: NavItem[] }) {
  const { menuOpen, setMenu } = useUi();
  const user = useAuth((s) => s.user);
  const [expanded, setExpanded] = useState<string | null>(null);
  const close = () => setMenu(false);

  return (
    <Drawer open={menuOpen} onClose={close} side="left" title="Menu">
      <nav aria-label="Mobile" className="px-6 py-4">
        <ul className="divide-y divide-stone-200">
          {nav.map((item, i) => {
            const children = item.category?.children.map((c) => ({ label: c.name, href: `/category/${c.slug}` })) ??
              item.collections?.map((c) => ({ label: c.name, href: `/collections/${c.slug}` }));
            const isOpen = expanded === item.label;
            return (
              <motion.li
                key={item.label}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease: EASE }}
              >
                {children?.length ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between py-4 font-display text-[1.7rem]"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded(isOpen ? null : item.label)}
                    >
                      {item.label}
                      <ChevronDown className={cn('h-4 w-4 transition-transform duration-500 ease-luxe', isOpen && 'rotate-180')} strokeWidth={1.4} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.45, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <li>
                            <Link href={item.href} onClick={close} className="block py-2 pl-1 text-sm font-medium">
                              View all
                            </Link>
                          </li>
                          {children.map((c) => (
                            <li key={c.href}>
                              <Link href={c.href} onClick={close} className="block py-2 pl-1 text-sm text-stone-600">
                                {c.label}
                              </Link>
                            </li>
                          ))}
                          <li className="h-3" aria-hidden />
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <Link href={item.href} onClick={close} className={cn('block py-4 font-display text-[1.7rem]', item.accent && 'text-sale')}>
                    {item.label}
                  </Link>
                )}
              </motion.li>
            );
          })}
        </ul>

        <div className="mt-8 space-y-3 border-t border-stone-200 pt-8 text-sm">
          <Link href={user ? '/account' : '/login'} onClick={close} className="block">
            {user ? `My account · ${user.firstName}` : 'Sign in / Register'}
          </Link>
          <Link href="/wishlist" onClick={close} className="block">
            Wishlist
          </Link>
          <Link href="/track-order" onClick={close} className="block">
            Track an order
          </Link>
          <Link href="/contact" onClick={close} className="block">
            Client services
          </Link>
        </div>
      </nav>
    </Drawer>
  );
}
