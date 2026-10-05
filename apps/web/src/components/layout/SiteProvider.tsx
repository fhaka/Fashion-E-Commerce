'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { SiteConfig } from '@/lib/types';

/** Store settings and demo info for client components (server components use lib/site.ts). */
const SiteContext = createContext<SiteConfig | null>(null);

export function SiteProvider({ config, children }: { config: SiteConfig; children: ReactNode }) {
  return <SiteContext.Provider value={config}>{children}</SiteContext.Provider>;
}

function useSiteConfig() {
  const config = useContext(SiteContext);
  if (!config) throw new Error('useSite must be used inside <SiteProvider>');
  return config;
}

export const useSite = () => useSiteConfig().settings;
export const useDemo = () => useSiteConfig().demo;
