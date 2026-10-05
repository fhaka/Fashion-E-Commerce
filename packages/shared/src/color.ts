/** WCAG colour helpers for the store's brand colours (Admin → Settings → Brand). */

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

export function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('')}`;

/**
 * Darkens a colour step by step until it reaches `ratio` contrast against every background.
 * Used to derive the accessible "accent dark" shade (accent-coloured text) from the brand accent.
 */
export function darkenToContrast(hex: string, backgrounds: string[], ratio = 4.5) {
  let rgb = channels(hex);
  for (let i = 0; i < 100; i++) {
    const candidate = toHex(rgb);
    if (backgrounds.every((bg) => contrastRatio(candidate, bg) >= ratio)) return candidate;
    rgb = rgb.map((v) => v * 0.96);
  }
  return '#000000';
}

/** `top` laid over `bottom` at `alpha` opacity (e.g. a 15% accent tint on white). */
export function blend(top: string, bottom: string, alpha: number) {
  const t = channels(top);
  const b = channels(bottom);
  return toHex(t.map((v, i) => v * alpha + b[i] * (1 - alpha)));
}

/** The full set of theme colours the storefront uses, derived from the three brand colours. */
export function themeColors(theme: { themeInk: string; themeBone: string; themeAccent: string }) {
  const { themeInk: ink, themeBone: bone, themeAccent: accent } = theme;
  return {
    ink,
    bone,
    accent,
    // Accent-coloured small text must stay readable on white, the light background and the
    // light accent tints used for badges and notices.
    accentDark: darkenToContrast(accent, ['#ffffff', bone, blend(accent, '#ffffff', 0.15), blend(accent, bone, 0.1)]),
  };
}
