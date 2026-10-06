'use client';

import { motion } from 'motion/react';
import { useStaticMotion } from '@/components/motion';
import { EASE } from '@/lib/utils';

/** Re-mounts on every navigation, giving each page a soft fade-in transition (Premium motion). */
export default function Template({ children }: { children: React.ReactNode }) {
  const still = useStaticMotion();
  return (
    <motion.div initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: EASE }}>
      {children}
    </motion.div>
  );
}
