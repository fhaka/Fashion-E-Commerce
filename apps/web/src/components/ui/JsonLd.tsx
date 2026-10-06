'use client';

import { useFeature } from '../layout/SiteProvider';

/** schema.org structured data for rich search results (Premium plan). Rendered during SSR. */
export function JsonLd({ data }: { data: object }) {
  const enabled = useFeature('structuredData');
  if (!enabled) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\u003c') }} />;
}
