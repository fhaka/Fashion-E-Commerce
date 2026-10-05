import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

/** The brand display face (Cormorant Garamond, SIL OFL — see src/assets/fonts/OFL-LICENSE.txt). */
const font = (file: string) => readFile(join(process.cwd(), 'src/assets/fonts', file));

/** Default social-sharing image for pages without their own (product pages use product photos). */
export const alt = 'Maison — Modern Luxury Clothing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const [light, italic] = await Promise.all([font('cormorant-garamond-latin-300-normal.woff'), font('cormorant-garamond-latin-400-italic.woff')]);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0e0e0e',
          color: '#f5f2ed',
          padding: '72px 80px',
          fontFamily: 'Cormorant',
          fontWeight: 300,
        }}
      >
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: 8, textTransform: 'uppercase', color: '#b08d57' }}>Autumn / Winter 26</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 128, letterSpacing: 36, textTransform: 'uppercase', lineHeight: 1 }}>Maison</div>
          <div style={{ marginTop: 28, fontSize: 36, color: 'rgba(245,242,237,0.75)', fontStyle: 'italic', fontWeight: 400 }}>Considered clothing, made to be worn for decades.</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(245,242,237,0.55)' }}>
          <span>Outerwear · Tailoring · Cashmere · Leather</span>
          <span>Paris</span>
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
