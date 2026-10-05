/**
 * Demo imagery from Unsplash (free licence, hot-linked from images.unsplash.com
 * as Unsplash requires). Replace with your own product photography in production —
 * admins can upload new images per product from the dashboard.
 */
export function img(id: string, w = 1600): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;
}

export const heroImages = {
  aw26: img('photo-1603189343302-e603f7add05a', 2400),
  coatEdit: img('photo-1645561305502-63a9ba09ab09', 2400),
  menswear: img('photo-1507680434567-5739c80be1ac', 2400),
  promo: img('photo-1514813836041-518668f092b1', 2400),
  promoMobile: img('photo-1539533113208-f6df8cc8b543', 1200),
};

export const editorialImages = [
  { id: 'photo-1759229874914-c1ffdb3ebd0c', title: 'Quiet Neutrals', subtitle: 'Soft tailoring in oat and ivory' },
  { id: 'photo-1759229874810-26aa9a3dda92', title: 'After Dark', subtitle: 'Black, simply' },
  { id: 'photo-1629922954496-c53253aeadfc', title: 'The Long Coat', subtitle: 'Proportion as a statement' },
  { id: 'photo-1764299315386-e55df915e783', title: 'City Lines', subtitle: 'Considered pieces for movement' },
  { id: 'photo-1745962978498-13fac949e357', title: 'White Study', subtitle: 'Linen, poplin and light' },
  { id: 'photo-1594748504715-2e715b1034bf', title: 'First Frost', subtitle: 'Wool and cashmere for the cold' },
];

export const brandImages = {
  atelier: img('photo-1787505136296-1e8f0750e5ff', 1800),
  workshop: img('photo-1770910195240-ddec777b77f6', 1800),
  fabric: img('photo-1528458909336-e7a0adfed0a5', 1800),
};
