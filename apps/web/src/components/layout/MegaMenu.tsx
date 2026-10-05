'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import type { CategoryNode, Collection } from '@/lib/types';
import { EASE } from '@/lib/utils';
import { Img } from '../ui/Img';

export interface NavItem {
  label: string;
  href: string;
  accent?: boolean;
  category?: CategoryNode;
  collections?: Collection[];
}

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.035, delayChildren: 0.1 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };

export function MegaMenu({ item, onMouseEnter, onNavigate }: { item: NavItem; onMouseEnter: () => void; onNavigate: () => void }) {
  const tiles = item.category
    ? item.category.children.filter((c) => c.image).slice(0, 3).map((c) => ({ title: c.name, href: `/category/${c.slug}`, image: c.image! }))
    : (item.collections ?? []).filter((c) => c.heroImage).slice(0, 3).map((c) => ({ title: c.name, href: `/collections/${c.slug}`, image: c.heroImage! }));

  return (
    <motion.div
      className="absolute inset-x-0 top-full hidden overflow-hidden border-b border-stone-200 bg-paper text-ink xl:block"
      initial={{ height: 0 }}
      animate={{ height: 'auto' }}
      exit={{ height: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      onMouseEnter={onMouseEnter}
    >
      <div className="container-site grid grid-cols-12 gap-10 py-12">
        <motion.div className="col-span-3" variants={listVariants} initial="hidden" animate="show">
          <motion.p variants={itemVariants} className="eyebrow mb-6 text-stone-500">
            {item.category ? `Shop ${item.label}` : 'Our collections'}
          </motion.p>
          <ul className="space-y-3">
            {item.category && (
              <motion.li variants={itemVariants}>
                <Link href={item.href} onClick={onNavigate} className="link-underline font-display text-2xl">
                  View all {item.label.toLowerCase()}
                </Link>
              </motion.li>
            )}
            {(item.category?.children ?? []).map((c) => (
              <motion.li key={c.id} variants={itemVariants}>
                <Link href={`/category/${c.slug}`} onClick={onNavigate} className="link-underline font-display text-2xl">
                  {c.name}
                </Link>
              </motion.li>
            ))}
            {(item.collections ?? []).map((c) => (
              <motion.li key={c.id} variants={itemVariants}>
                <Link href={`/collections/${c.slug}`} onClick={onNavigate} className="link-underline font-display text-2xl">
                  {c.name}
                </Link>
              </motion.li>
            ))}
          </ul>
          {item.category && (
            <motion.div variants={itemVariants} className="mt-10 flex flex-col gap-2 text-sm text-stone-600">
              <Link href={`/shop?category=${item.category.slug}&isNew=true`} onClick={onNavigate} className="link-underline w-fit">
                New arrivals
              </Link>
              <Link href={`/shop?category=${item.category.slug}&bestSeller=true`} onClick={onNavigate} className="link-underline w-fit">
                Best sellers
              </Link>
              <Link href={`/shop?category=${item.category.slug}&onSale=true`} onClick={onNavigate} className="link-underline w-fit text-sale">
                Sale
              </Link>
            </motion.div>
          )}
        </motion.div>

        <div className="col-span-9 grid grid-cols-3 gap-5">
          {tiles.map((t, i) => (
            <motion.div
              key={t.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12 + i * 0.07, ease: EASE }}
            >
              <Link href={t.href} onClick={onNavigate} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
                  <Img
                    src={t.image}
                    alt={t.title}
                    fill
                    sizes="22vw"
                    className="object-cover transition-transform duration-[1.4s] ease-luxe group-hover:scale-105"
                  />
                </div>
                <p className="mt-3 text-[0.72rem] tracking-[0.16em] uppercase">{t.title}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
