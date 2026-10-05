import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getSiteSettings } from '@/lib/site';

/** The display face (Cormorant Garamond, SIL OFL — see src/assets/fonts/OFL-LICENSE.txt). */
const font = (file: string) => readFile(join(process.cwd(), 'src/assets/fonts', file));

/** Default social-sharing image for pages without their own (product pages use product photos). */
export const alt = 'Store preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const [light, italic, s] = await Promise.all([font('cormorant-garamond-latin-300-normal.woff'), font('cormorant-garamond-latin-400-italic.woff'), getSiteSettings()]);
  const { ink, bone, accent } = s.theme;
  // Shrink long names so they stay on one line.
  const nameSize = Math.min(128, Math.floor(1700 / Math.max(s.storeName.length, 6)));
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: ink,
          color: bone,
          padding: '72px 80px',
          fontFamily: 'Cormorant',
          fontWeight: 300,
        }}
      >
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: 8, textTransform: 'uppercase', color: accent }}>{s.tagline}</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: nameSize, letterSpacing: nameSize * 0.28, textTransform: 'uppercase', lineHeight: 1 }}>{s.storeName}</div>
          <div style={{ marginTop: 28, fontSize: 34, opacity: 0.75, fontStyle: 'italic', fontWeight: 400, maxWidth: 1000 }}>{s.description.length > 110 ? `${s.description.slice(0, 107)}…` : s.description}</div>
        </div>
        <div style={{ display: 'flex', fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', opacity: 0.55 }}>
          <span>{s.highlights.slice(0, 3).join(' · ')}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Cormorant', data: light, weight: 300, style: 'normal' },
        { name: 'Cormorant', data: italic, weight: 400, style: 'italic' },
      ],
    },
  );
}
