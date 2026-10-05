'use client';

import { MotionConfig } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/stores/auth';
import { useCart } from '@/stores/cart';

/** Boots client session state once: restores the login (via refresh cookie) and loads the bag. */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    useAuth
      .getState()
      .init()
      .finally(() => useCart.getState().fetch());
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
