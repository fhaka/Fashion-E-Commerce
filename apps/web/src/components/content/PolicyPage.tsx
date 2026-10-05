import type { Metadata } from 'next';
import { getContentPage, getSiteSettings } from '@/lib/site';
import type { ContentPage } from '@/lib/types';
import { PageIntro } from '../ui/PageIntro';
import { fillText, PolicyContent } from './Markdown';

/*
 * Shipping & returns, Privacy and Terms. Text is edited in Admin → Pages and starts from the
 * templates in apps/api/src/content/defaults.ts (legal templates need review by counsel).
 */

type PolicySlug = Exclude<ContentPage['slug'], 'about'>;

export async function policyMetadata(slug: PolicySlug, fallbackDescription: (storeName: string) => string): Promise<Metadata> {
  const [page, settings] = await Promise.all([getContentPage(slug), getSiteSettings()]);
  return {
    title: page.title,
    description: page.intro ? fillText(page.intro, settings) : fallbackDescription(settings.storeName),
    alternates: { canonical: `/${slug}` },
  };
}

export async function PolicyPage({ slug, eyebrow, showUpdated }: { slug: PolicySlug; eyebrow: string; showUpdated?: boolean }) {
  const [page, settings] = await Promise.all([getContentPage(slug), getSiteSettings()]);
  const updated = showUpdated ? new Date(page.updatedAt).toLocaleDateString(settings.locale, { month: 'long', year: 'numeric' }) : undefined;
  return (
    <>
      <PageIntro eyebrow={eyebrow} title={page.title} description={page.intro ? fillText(page.intro, settings) : null} breadcrumbs={[{ name: page.title }]} />
      <PolicyContent body={page.body} settings={settings} updated={updated} />
    </>
  );
}
