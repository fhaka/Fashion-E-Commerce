'use client';

import { AnimatePresence, motion } from 'motion/react';
import { FlaskConical, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DemoInfo } from '@/lib/types';
import { cn, EASE } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { toast } from '@/stores/toast';

/* Public sales demo (API DEMO_MODE=true). Everything here renders nothing on a real shop. */

const DemoContext = createContext<DemoInfo | null>(null);

export function DemoProvider({ demo, children }: { demo: DemoInfo | null; children: ReactNode }) {
  return <DemoContext.Provider value={demo}>{children}</DemoContext.Provider>;
}

export const useDemo = () => useContext(DemoContext);

const resetTime = (demo: DemoInfo) => `${String(demo.resetHourUtc).padStart(2, '0')}:00 UTC`;

/** Signs in as a demo role and lands on the matching area. */
function useDemoSignIn() {
  const demoLogin = useAuth((s) => s.demoLogin);
  const router = useRouter();
  const [pending, setPending] = useState<'customer' | 'admin' | null>(null);
  const signIn = async (role: 'customer' | 'admin') => {
    setPending(role);
    try {
      const user = await demoLogin(role);
      toast.success(role === 'admin' ? 'Signed in to the demo admin' : `Signed in as ${user.firstName}, a demo customer`);
      router.push(role === 'admin' ? '/admin' : '/account');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start the demo session');
    } finally {
      setPending(null);
    }
  };
  return { signIn, pending };
}

const STORAGE_KEY = 'maison_demo_badge';

/** Floating notice explaining the demo, with one-click entry to the customer and admin views. */
export function DemoBadge() {
  const demo = useDemo();
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const { signIn, pending } = useDemoSignIn();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Open on a visitor's first page view (the sign-in page has its own demo shortcut);
  // remember when they close it.
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(STORAGE_KEY) === 'closed';
    } catch {}
    setOpen(!dismissed && pathname !== '/login');
    // Only decide on first mount; later navigation shouldn't reopen it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (next: boolean) => {
    setOpen(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next ? 'open' : 'closed');
    } catch {}
  };

  // Collapse once the visitor picks a view, so the panel doesn't cover the page they land on.
  const enter = async (role: 'customer' | 'admin') => {
    if (role === 'admin' && user?.role === 'ADMIN') router.push('/admin');
    else await signIn(role);
    toggle(false);
  };

  if (!demo) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-start gap-2 print:hidden">
      <AnimatePresence initial={false}>
        {open && (
          <motion.section
            key="panel"
            aria-label="About this demo"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="pointer-events-auto w-[22rem] max-w-full border border-ink/10 bg-paper p-5 text-ink shadow-[0_20px_50px_-20px_rgb(0_0_0/0.35)]"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="eyebrow text-camel-dark">Live demo</p>
              <button type="button" onClick={() => toggle(false)} className="-m-2 p-2 text-stone-500 hover:text-ink" aria-label="Hide demo notice">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 font-display text-2xl leading-tight">Explore the shop and its admin</p>
            <ul className="mt-3 space-y-1.5 text-[0.8rem] leading-relaxed text-stone-600">
              <li>Payments are simulated: no card is charged.</li>
              <li>All data resets every day at {resetTime(demo)}.</li>
              <li>Please don&apos;t enter real personal details.</li>
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => enter('customer')}
                disabled={!!pending || user?.role === 'CUSTOMER'}
                className="h-10 border border-ink text-[0.66rem] font-medium tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-bone disabled:opacity-40"
              >
                {pending === 'customer' ? 'Signing in…' : 'Customer view'}
              </button>
              <button
                type="button"
                onClick={() => enter('admin')}
                disabled={!!pending}
                className="h-10 bg-ink text-[0.66rem] font-medium tracking-[0.14em] text-bone uppercase transition-opacity hover:opacity-85 disabled:opacity-40"
              >
                {pending === 'admin' ? 'Signing in…' : user?.role === 'ADMIN' ? 'Go to admin' : 'Open the admin'}
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => toggle(!open)}
        aria-expanded={open}
        className={cn(
          'pointer-events-auto flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-[0.66rem] font-medium tracking-[0.16em] text-bone uppercase shadow-lg transition-opacity',
          open && 'opacity-0 max-sm:hidden',
        )}
      >
        <FlaskConical className="h-3.5 w-3.5" aria-hidden /> Demo
      </button>
    </div>
  );
}

/** Demo shortcut shown on the sign-in page. */
export function DemoSignIn() {
  const demo = useDemo();
  const { signIn, pending } = useDemoSignIn();
  if (!demo) return null;
  return (
    <div className="mb-8 border border-camel/40 bg-camel/10 p-5">
      <p className="eyebrow text-camel-dark">Demo store</p>
      <p className="mt-2 text-sm text-stone-700">Skip the form: sign in instantly with a demo account.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => signIn('customer')}
          disabled={!!pending}
          className="h-11 border border-ink bg-paper text-[0.66rem] font-medium tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-bone disabled:opacity-40"
        >
          {pending === 'customer' ? 'Signing in…' : 'As a customer'}
        </button>
        <button
          type="button"
          onClick={() => signIn('admin')}
          disabled={!!pending}
          className="h-11 bg-ink text-[0.66rem] font-medium tracking-[0.14em] text-bone uppercase transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          {pending === 'admin' ? 'Signing in…' : 'As the admin'}
        </button>
      </div>
    </div>
  );
}
