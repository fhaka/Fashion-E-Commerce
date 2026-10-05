import { img } from './images';

export type SizeGroup = 'APPAREL' | 'WAIST' | 'SHOE_W' | 'SHOE_M' | 'ONE_SIZE';

export const sizeGroups: Record<SizeGroup, string[]> = {
  APPAREL: ['XS', 'S', 'M', 'L', 'XL'],
  WAIST: ['28', '30', '32', '34', '36'],
  SHOE_W: ['36', '37', '38', '39', '40', '41'],
  SHOE_M: ['40', '41', '42', '43', '44', '45'],
  ONE_SIZE: ['One Size'],
};

export const colors = [
  { name: 'Black', hex: '#111111' },
  { name: 'Ivory', hex: '#F2EDE3' },
  { name: 'Camel', hex: '#B48A5A' },
  { name: 'Charcoal', hex: '#3A3A3C' },
  { name: 'Navy', hex: '#1F2A44' },
  { name: 'Oatmeal', hex: '#D8CCB6' },
  { name: 'Chocolate', hex: '#4A3426' },
  { name: 'Stone', hex: '#BDB3A1' },
  { name: 'White', hex: '#FAFAF8' },
  { name: 'Indigo', hex: '#2D3A5C' },
  { name: 'Burgundy', hex: '#6B1F2A' },
  { name: 'Grey Melange', hex: '#9C9C9A' },
  { name: 'Sky', hex: '#A9C1D9' },
  { name: 'Terracotta', hex: '#B5523B' },
  { name: 'Scarlet', hex: '#A3161F' },
] as const;

export type ColorName = (typeof colors)[number]['name'];

export interface CategorySeed {
  name: string;
  slug: string;
  description: string;
  image: string;
  children?: Omit<CategorySeed, 'children'>[];
}

export const categories: CategorySeed[] = [
  {
    name: 'Women',
    slug: 'women',
    description: 'Considered wardrobe essentials and statement outerwear, cut in our Paris atelier.',
    image: img('photo-1590873802674-55bb8f947bc5', 1400),
    children: [
      { name: 'Coats & Jackets', slug: 'women-coats-jackets', description: 'Wool, cashmere and leather outerwear built to last decades.', image: img('photo-1539533113208-f6df8cc8b543', 1200) },
      { name: 'Knitwear', slug: 'women-knitwear', description: 'Cashmere and merino knits, spun in Scotland and Italy.', image: img('photo-1587999882859-34b3f313df77', 1200) },
      { name: 'Dresses', slug: 'women-dresses', description: 'Silk, satin and crêpe dresses for day and evening.', image: img('photo-1704775990248-4c1c1a276b4f', 1200) },
      { name: 'Shirts & Tops', slug: 'women-shirts-tops', description: 'Crisp poplin shirts and organic cotton jersey.', image: img('photo-1609369350331-4f12b446d487', 1200) },
      { name: 'Tailoring', slug: 'women-tailoring', description: 'Blazers and trousers with a precise, modern line.', image: img('photo-1616065297556-f05bc00c9a3e', 1200) },
      { name: 'Trousers & Skirts', slug: 'women-trousers-skirts', description: 'Wide-leg trousers, linen and fluid midi skirts.', image: img('photo-1767631338127-8cd80ee2f9df', 1200) },
    ],
  },
  {
    name: 'Men',
    slug: 'men',
    description: 'Tailoring, outerwear and everyday staples made from the finest natural fibres.',
    image: img('photo-1504593811423-6dd665756598', 1400),
    children: [
      { name: 'Coats & Jackets', slug: 'men-coats-jackets', description: 'Overcoats, trenches and leather jackets.', image: img('photo-1619603364904-c0498317e145', 1200) },
      { name: 'Suiting', slug: 'men-suiting', description: 'Half-canvassed suits in Italian wool.', image: img('photo-1617137968427-85924c800a22', 1200) },
      { name: 'Shirts', slug: 'men-shirts', description: 'Oxford, poplin and gingham shirting.', image: img('photo-1620012253295-c15cc3e65df4', 1200) },
      { name: 'Knitwear', slug: 'men-knitwear', description: 'Merino and cashmere knits for every season.', image: img('photo-1608975321561-176c1b187d24', 1200) },
      { name: 'Denim & Trousers', slug: 'men-denim-trousers', description: 'Japanese selvedge denim and tailored chinos.', image: img('photo-1555689502-c4b22d76c56f', 1200) },
      { name: 'T-Shirts & Sweats', slug: 'men-tshirts-sweats', description: 'Heavyweight jersey and loopback cotton.', image: img('photo-1627225924765-552d49cf47ad', 1200) },
    ],
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Leather goods and footwear, finished by hand.',
    image: img('photo-1569388330292-79cc1ec67270', 1400),
    children: [
      { name: 'Bags', slug: 'bags', description: 'Vegetable-tanned leather totes, crossbodies and travel bags.', image: img('photo-1598532163257-ae3c6b2524b6', 1200) },
      { name: 'Footwear', slug: 'footwear', description: 'Goodyear-welted boots and Italian leather shoes.', image: img('photo-1608256246200-53e635b5b65f', 1200) },
    ],
  },
];

export const collections = [
  {
    name: 'Autumn / Winter 26',
    slug: 'autumn-winter-26',
    description:
      'A study in warmth and restraint. Double-faced wools, brushed cashmere and supple leather in a palette of camel, chocolate and ink.',
    heroImage: img('photo-1594748504715-2e715b1034bf', 2400),
    isFeatured: true,
  },
  {
    name: 'The Essentials',
    slug: 'the-essentials',
    description: 'The foundation of a lasting wardrobe: perfect shirts, knits and tees you will reach for every day.',
    heroImage: img('photo-1759229874914-c1ffdb3ebd0c', 2400),
    isFeatured: true,
  },
  {
    name: 'Atelier Tailoring',
    slug: 'atelier-tailoring',
    description: 'Half-canvassed construction, hand-finished buttonholes and a silhouette refined over a decade.',
    heroImage: img('photo-1613915617430-8ab0fd7c6baf', 2400),
    isFeatured: true,
  },
  {
    name: 'The Weekend Edit',
    slug: 'weekend-edit',
    description: 'Relaxed linen, soft jersey and easy layers for slower days.',
    heroImage: img('photo-1778397018651-e36a85c886c0', 2400),
    isFeatured: false,
  },
  {
    name: 'Archive Sale',
    slug: 'archive-sale',
    description: 'Selected pieces from past seasons, now at reduced prices. Limited quantities.',
    heroImage: img('photo-1573545289441-827c028f7a3b', 2400),
    isFeatured: false,
  },
];

export interface ProductSeed {
  name: string;
  category: string;
  gender: 'WOMEN' | 'MEN' | 'UNISEX';
  price: number; // dollars
  compareAt?: number; // dollars
  sizes: SizeGroup;
  /** Gallery per colour — the first colour is the default. */
  colors: Partial<Record<ColorName, string[]>>;
  collections?: string[];
  featured?: boolean;
  bestSeller?: boolean;
  isNew?: boolean;
  description: string;
  details: string[];
  materials: string;
  care: string;
  videoUrl?: string;
}

const WOOL_CARE = 'Dry clean only. Brush gently after wear and store on a wide wooden hanger. Steam to refresh.';
const CASHMERE_CARE = 'Hand wash cold with wool detergent, or dry clean. Dry flat in shape. Store folded with cedar.';
const COTTON_CARE = 'Machine wash at 30°C on a gentle cycle. Line dry. Warm iron on reverse.';
const SILK_CARE = 'Dry clean recommended. Alternatively hand wash cold, do not wring, iron on low heat on reverse.';
const LEATHER_CARE = 'Wipe with a soft dry cloth. Condition twice a year. Keep away from direct heat and prolonged sunlight.';
const DENIM_CARE = 'Wash inside out at 30°C as rarely as possible to preserve the indigo. Line dry.';

export const products: ProductSeed[] = [
  /* ──────────────────────────────── WOMEN ──────────────────────────────── */
  {
    name: 'Camel Wrap Coat',
    category: 'women-coats-jackets',
    gender: 'WOMEN',
    price: 590,
    sizes: 'APPAREL',
    colors: {
      Camel: ['photo-1539533113208-f6df8cc8b543', 'photo-1618333453296-9e35280fd6b1', 'photo-1608635680046-aebf91c1a9c8', 'photo-1550872199-63f4382fe925'],
      Charcoal: ['photo-1619470149201-63960dec27cf', 'photo-1586081493946-c75071ee57c0'],
    },
    collections: ['autumn-winter-26'],
    featured: true,
    bestSeller: true,
    description:
      'Our signature wrap coat, cut from a dense double-faced wool and cashmere blend that drapes beautifully and holds its shape. Dropped shoulders, deep patch pockets and a self-tie belt create an effortless, enveloping silhouette.',
    details: ['Relaxed fit — take your usual size', 'Shawl collar and self-tie belt', 'Unlined double-faced construction', 'Deep patch pockets', 'Length: 118 cm in size S'],
    materials: '90% virgin wool, 10% cashmere. Woven in Biella, Italy.',
    care: WOOL_CARE,
  },
  {
    name: 'Double-Faced Wool Coat',
    category: 'women-coats-jackets',
    gender: 'WOMEN',
    price: 680,
    sizes: 'APPAREL',
    colors: {
      Ivory: ['photo-1643578545817-135602f5b9e2', 'photo-1773955130654-88b0f92118d2'],
      Black: ['photo-1705798543468-5b951da25e1e', 'photo-1626576352171-211d1cc5ec73'],
    },
    collections: ['autumn-winter-26'],
    isNew: true,
    description:
      'A clean-lined, single-breasted coat in hand-finished double-faced wool. The seams are folded and stitched by hand so the coat is as beautiful inside as out — and light enough to layer over knitwear without bulk.',
    details: ['Regular fit', 'Notch lapel, concealed button placket', 'Hand-finished seams', 'Side-seam pockets', 'Length: 112 cm in size S'],
    materials: '100% virgin wool. Woven in Italy.',
    care: WOOL_CARE,
  },
  {
    name: 'Belted Trench Coat',
    category: 'women-coats-jackets',
    gender: 'WOMEN',
    price: 495,
    sizes: 'APPAREL',
    colors: {
      Stone: ['photo-1637102146291-c408b298e22b', 'photo-1744112614579-ed8e803113e4', 'photo-1544246108-14b45872b02d'],
      Black: ['photo-1760551937537-a29dbbfab30b', 'photo-1790802222952-eb7e610de0d1'],
    },
    collections: ['autumn-winter-26', 'the-essentials'],
    bestSeller: true,
    description:
      'The trench, perfected. Water-repellent cotton gabardine with a storm flap, gun flap and raglan sleeves. Wear it belted for structure or open for an easy, relaxed line.',
    details: ['Relaxed fit', 'Double-breasted with horn buttons', 'Water-repellent finish', 'Detachable belt and cuff straps', 'Fully lined in cotton'],
    materials: 'Shell: 100% cotton gabardine. Lining: 100% cotton.',
    care: 'Dry clean only. Re-proof annually to maintain water repellency.',
  },
  {
    name: 'Leather Moto Jacket',
    category: 'women-coats-jackets',
    gender: 'WOMEN',
    price: 720,
    sizes: 'APPAREL',
    colors: {
      Black: ['photo-1602370463198-086436840055', 'photo-1511280303142-0051e93baeeb', 'photo-1727515546577-f7d82a47b51d', 'photo-1615397815341-bb06f6d55c94'],
      Chocolate: ['photo-1619731428826-a535570610b1'],
    },
    collections: ['autumn-winter-26'],
    featured: true,
    description:
      'Butter-soft lambskin in a cropped biker shape that softens and moulds to you with every wear. Asymmetric zip, notched lapels and a fitted waist with side buckles.',
    details: ['Slim fit — size up for layering', 'Asymmetric YKK Excella zip', 'Zip cuffs and three exterior pockets', 'Cupro lining'],
    materials: '100% lambskin leather. Lining: 100% cupro.',
    care: LEATHER_CARE,
  },
  {
    name: 'Cashmere Crewneck',
    category: 'women-knitwear',
    gender: 'WOMEN',
    price: 320,
    sizes: 'APPAREL',
    colors: {
      Oatmeal: ['photo-1587999882859-34b3f313df77', 'photo-1773747310674-b42a55d72003'],
      'Grey Melange': ['photo-1574201635302-388dd92a4c3f'],
    },
    collections: ['the-essentials', 'autumn-winter-26'],
    bestSeller: true,
    description:
      'Spun from long-staple Mongolian cashmere and knitted in Scotland, this crewneck is impossibly soft yet resilient enough to keep its shape for years. A relaxed body with neat ribbed trims.',
    details: ['Relaxed fit', '2-ply 12-gauge knit', 'Ribbed collar, cuffs and hem', 'Fully fashioned shoulders'],
    materials: '100% Grade-A Mongolian cashmere. Knitted in Scotland.',
    care: CASHMERE_CARE,
  },
  {
    name: 'Chunky Rib Cardigan',
    category: 'women-knitwear',
    gender: 'WOMEN',
    price: 280,
    compareAt: 350,
    sizes: 'APPAREL',
    colors: {
      Chocolate: ['photo-1773747310662-e7cc9e681226', 'photo-1634653131107-ecc30d4501ac'],
      Ivory: ['photo-1687275161342-8699c61e4364'],
    },
    collections: ['archive-sale'],
    description:
      'A generous, hand-framed cardigan in a plump English rib. Horn buttons and a slightly cropped length make it the ideal layer over slip dresses and wide trousers.',
    details: ['Oversized fit', 'Horn buttons', 'Dropped shoulders', 'Hand-framed in Italy'],
    materials: '70% merino wool, 30% alpaca.',
    care: CASHMERE_CARE,
  },
  {
    name: 'Silk Slip Dress',
    category: 'women-dresses',
    gender: 'WOMEN',
    price: 390,
    sizes: 'APPAREL',
    colors: {
      Black: ['photo-1704775990248-4c1c1a276b4f', 'photo-1759229874810-26aa9a3dda92'],
      Navy: ['photo-1704775983143-2c83798831db'],
    },
    collections: ['autumn-winter-26'],
    isNew: true,
    description:
      'Cut on the bias from heavyweight sandwashed silk, this slip dress skims the body and moves like liquid. Adjustable straps and a softly cowled neckline.',
    details: ['Bias cut, true to size', 'Adjustable spaghetti straps', 'Cowl neckline', 'Midi length: 120 cm in size S'],
    materials: '100% mulberry silk, 22 momme.',
    care: SILK_CARE,
  },
  {
    name: 'Bias-Cut Midi Dress',
    category: 'women-dresses',
    gender: 'WOMEN',
    price: 340,
    sizes: 'APPAREL',
    colors: {
      Sky: ['photo-1642776669775-94f657988a43', 'photo-1642609881805-c8b7b54d97b3'],
    },
    collections: ['weekend-edit'],
    description:
      'A fluid crêpe dress with a gently fitted bodice and a bias-cut skirt that swings as you walk. Designed to be worn from long lunches to late evenings.',
    details: ['Regular fit', 'Concealed side zip', 'Square neckline', 'Midi length'],
    materials: '100% viscose crêpe, Ecovero™ certified.',
    care: 'Hand wash cold or dry clean. Iron on low heat.',
  },
  {
    name: 'Scarlet Column Dress',
    category: 'women-dresses',
    gender: 'WOMEN',
    price: 420,
    compareAt: 560,
    sizes: 'APPAREL',
    colors: {
      Scarlet: ['photo-1651047666890-8eab731ee345', 'photo-1664515226058-03952a19bd76'],
    },
    collections: ['archive-sale'],
    description:
      'A sculptural column dress in a dense double crêpe, in our signature scarlet. A high neckline and open back make for a striking evening silhouette.',
    details: ['Fitted', 'Open back with button closure', 'Floor length', 'Fully lined'],
    materials: '95% triacetate, 5% elastane. Lining: 100% silk.',
    care: 'Dry clean only.',
  },
  {
    name: 'Oversized Poplin Shirt',
    category: 'women-shirts-tops',
    gender: 'WOMEN',
    price: 165,
    sizes: 'APPAREL',
    colors: {
      White: ['photo-1609369350331-4f12b446d487', 'photo-1609369350243-83d11c675ff8', 'photo-1548534796-12615d80396c'],
    },
    collections: ['the-essentials'],
    bestSeller: true,
    description:
      'The white shirt you will wear forever. Crisp Italian poplin in a generous, slightly boxy shape with a long back hem and mother-of-pearl buttons.',
    details: ['Oversized fit — consider sizing down', 'Mother-of-pearl buttons', 'Curved dipped hem', 'Single chest pocket'],
    materials: '100% organic cotton poplin, 120s two-ply.',
    care: COTTON_CARE,
  },
  {
    name: 'Organic Cotton Tee',
    category: 'women-shirts-tops',
    gender: 'WOMEN',
    price: 65,
    sizes: 'APPAREL',
    colors: {
      White: ['photo-1610142991820-e02266a4a9f0', 'photo-1622445270936-5dcb604970e7', 'photo-1581655353564-df123a1eb820'],
      Black: ['photo-1583743814966-8936f5b7be1a'],
    },
    collections: ['the-essentials', 'weekend-edit'],
    description:
      'A mid-weight jersey tee with a close, clean neckline and a straight body. Garment-dyed for a lived-in softness from the first wear.',
    details: ['Regular fit', '190 gsm organic jersey', 'Narrow ribbed neckline', 'Garment dyed'],
    materials: '100% GOTS-certified organic cotton.',
    care: COTTON_CARE,
  },
  {
    name: 'Tailored Wool Blazer',
    category: 'women-tailoring',
    gender: 'WOMEN',
    price: 450,
    sizes: 'APPAREL',
    colors: {
      Black: ['photo-1616065297556-f05bc00c9a3e', 'photo-1779400201925-6c6048bee7e5', 'photo-1584273143981-41c073dfe8f8'],
      Charcoal: ['photo-1608234808654-2a8875faa7fd', 'photo-1604904612715-47bf9d9bc670'],
      Ivory: ['photo-1571513722275-4b41940f54b8'],
    },
    collections: ['atelier-tailoring'],
    featured: true,
    bestSeller: true,
    description:
      'A sharply cut single-breasted blazer with a strong shoulder and a softly nipped waist. Half-canvassed so it moulds to your frame over time.',
    details: ['Regular fit', 'Half-canvassed construction', 'Peak lapels', 'Functional cuff buttons', 'Fully lined in Bemberg'],
    materials: '100% Super 110s wool. Lining: 100% cupro.',
    care: WOOL_CARE,
  },
  {
    name: 'Pleated Wide-Leg Trousers',
    category: 'women-tailoring',
    gender: 'WOMEN',
    price: 220,
    sizes: 'APPAREL',
    colors: {
      Black: ['photo-1767631338127-8cd80ee2f9df', 'photo-1552902875-9ac1f9fe0c07'],
    },
    collections: ['atelier-tailoring', 'the-essentials'],
    description:
      'High-rise, double-pleated trousers that fall in a long, clean line to the floor. Pair with the Tailored Wool Blazer for a modern suit.',
    details: ['High rise, wide leg', 'Double front pleats', 'Hook and bar closure', 'Pressed centre crease'],
    materials: '98% wool, 2% elastane.',
    care: WOOL_CARE,
  },
  {
    name: 'Pinstripe High-Rise Trousers',
    category: 'women-trousers-skirts',
    gender: 'WOMEN',
    price: 240,
    sizes: 'APPAREL',
    colors: {
      Ivory: ['photo-1789110854083-e4752bded644'],
    },
    collections: ['atelier-tailoring'],
    isNew: true,
    description:
      'A fresh take on classic suiting stripes: ivory with a fine black pinstripe, a high waist and a straight, elongating leg.',
    details: ['High rise, straight leg', 'Side slant pockets', 'Belt loops', 'Inseam: 80 cm'],
    materials: '64% polyester, 34% viscose, 2% elastane.',
    care: 'Machine wash cold, gentle cycle. Hang to dry.',
  },
  {
    name: 'Linen Drawstring Trousers',
    category: 'women-trousers-skirts',
    gender: 'WOMEN',
    price: 185,
    sizes: 'APPAREL',
    colors: {
      Terracotta: ['photo-1789110854331-6d3cabfef781'],
    },
    collections: ['weekend-edit'],
    description:
      'Washed European linen trousers with a soft drawstring waist and relaxed straight leg. Breathable, easy and better with every wash.',
    details: ['Relaxed fit', 'Elasticated drawstring waist', 'Side pockets', 'Stone washed'],
    materials: '100% European flax linen.',
    care: COTTON_CARE,
  },
  {
    name: 'Satin Midi Skirt',
    category: 'women-trousers-skirts',
    gender: 'WOMEN',
    price: 210,
    sizes: 'APPAREL',
    colors: {
      Chocolate: ['photo-1618244942912-7351be026e8b'],
      Black: ['photo-1708363390847-b4af54f45273'],
    },
    collections: ['autumn-winter-26'],
    description:
      'A bias-cut skirt in fluid satin that catches the light as you move. Elasticated at the back for comfort, with a clean flat front.',
    details: ['Bias cut', 'Partially elasticated waist', 'Midi length: 85 cm'],
    materials: '100% recycled polyester satin.',
    care: 'Hand wash cold. Iron on low on reverse.',
  },

  /* ──────────────────────────────── MEN ──────────────────────────────── */
  {
    name: 'Cashmere Overcoat',
    category: 'men-coats-jackets',
    gender: 'MEN',
    price: 890,
    sizes: 'APPAREL',
    colors: {
      Camel: ['photo-1619603364904-c0498317e145', 'photo-1619603364937-8d7af41ef206'],
      Charcoal: ['photo-1779206887045-cf1e51e350dd', 'photo-1644269444230-c6d1f2722e10'],
    },
    collections: ['autumn-winter-26'],
    featured: true,
    bestSeller: true,
    description:
      'A timeless single-breasted overcoat in a luxurious wool and cashmere blend. Cut to sit just below the knee with enough room to layer over tailoring.',
    details: ['Regular fit', 'Notch lapel, three-button front', 'Flap pockets and ticket pocket', 'Centre back vent', 'Fully lined'],
    materials: '80% wool, 20% cashmere. Woven by Loro Piana.',
    care: WOOL_CARE,
  },
  {
    name: 'Single-Breasted Trench',
    category: 'men-coats-jackets',
    gender: 'MEN',
    price: 560,
    sizes: 'APPAREL',
    colors: {
      Stone: ['photo-1737508945707-ebdccee97cc5'],
    },
    collections: ['autumn-winter-26'],
    isNew: true,
    description:
      'A pared-back trench in dense cotton gabardine. Concealed placket, raglan sleeves and a removable belt keep the look streamlined.',
    details: ['Relaxed fit', 'Concealed button placket', 'Raglan sleeves', 'Removable belt'],
    materials: '100% cotton gabardine, water-repellent finish.',
    care: 'Dry clean only.',
  },
  {
    name: 'Leather Rider Jacket',
    category: 'men-coats-jackets',
    gender: 'MEN',
    price: 850,
    sizes: 'APPAREL',
    colors: {
      Black: ['photo-1553591589-2e96ef7eca65', 'photo-1675877879221-871aa9f7c314', 'photo-1602700205182-923ff4b8e643'],
      Chocolate: ['photo-1614252369475-531eba835eb1', 'photo-1700993443419-b6f067e734e4', 'photo-1578198576866-7e0ba6078128'],
    },
    collections: ['autumn-winter-26'],
    featured: true,
    description:
      'Vegetable-tanned calf leather in a clean, collarless rider shape. Developed to age with a rich patina that is entirely your own.',
    details: ['Regular fit', 'Two-way YKK zip', 'Snap-tab collar', 'Internal zip pocket', 'Quilted lining'],
    materials: '100% calf leather. Lining: 100% cotton.',
    care: LEATHER_CARE,
  },
  {
    name: 'Navy Two-Piece Suit',
    category: 'men-suiting',
    gender: 'MEN',
    price: 1150,
    sizes: 'APPAREL',
    colors: {
      Navy: ['photo-1617137968427-85924c800a22', 'photo-1617137984095-74e4e5e3613f', 'photo-1603394151492-5e9b974b090b'],
    },
    collections: ['atelier-tailoring'],
    featured: true,
    bestSeller: true,
    description:
      'Our house suit: half-canvassed, soft-shouldered and cut from a high-twist Italian wool that resists creasing. Sold as a set with flat-front trousers.',
    details: ['Tailored fit', 'Half-canvassed', 'Notch lapel, two-button', 'Surgeon cuffs', 'Flat-front trousers with side adjusters'],
    materials: '100% Super 130s wool by Vitale Barberis Canonico.',
    care: WOOL_CARE,
  },
  {
    name: 'Black Evening Suit',
    category: 'men-suiting',
    gender: 'MEN',
    price: 1250,
    sizes: 'APPAREL',
    colors: {
      Black: ['photo-1618886614638-80e3c103d31a', 'photo-1617113930975-f9c7243ae527', 'photo-1617127365659-c47fa864d8bc'],
    },
    collections: ['atelier-tailoring', 'autumn-winter-26'],
    description:
      'A modern black suit that works as an evening look or a sharp everyday uniform. Slim lapels and a clean, close-to-body cut.',
    details: ['Slim fit', 'Single-breasted, one button', 'Jetted pockets', 'Fully lined'],
    materials: '100% wool barathea.',
    care: WOOL_CARE,
  },
  {
    name: 'Grey Flannel Suit',
    category: 'men-suiting',
    gender: 'MEN',
    price: 1050,
    compareAt: 1300,
    sizes: 'APPAREL',
    colors: {
      Charcoal: ['photo-1622497170185-5d668f816a56'],
    },
    collections: ['archive-sale', 'atelier-tailoring'],
    description:
      'Brushed English flannel in a mid-grey with a soft, natural shoulder. The original power suit, reworked for a relaxed modern fit.',
    details: ['Regular fit', 'Half-canvassed', 'Pleated trousers', 'Horn buttons'],
    materials: '100% wool flannel, woven in Yorkshire.',
    care: WOOL_CARE,
  },
  {
    name: 'Wool Sport Blazer',
    category: 'men-suiting',
    gender: 'MEN',
    price: 520,
    sizes: 'APPAREL',
    colors: {
      Chocolate: ['photo-1517938889432-a2ac9241a486'],
      Black: ['photo-1535891169584-75bcaf12e964'],
    },
    collections: ['atelier-tailoring'],
    description:
      'An unstructured sport blazer that bridges tailoring and casual wear. Patch pockets and a soft shoulder make it ideal over knitwear.',
    details: ['Regular fit', 'Unstructured, quarter-lined', 'Patch pockets', 'Corozo buttons'],
    materials: '100% wool hopsack.',
    care: WOOL_CARE,
  },
  {
    name: 'Merino Turtleneck',
    category: 'men-knitwear',
    gender: 'MEN',
    price: 210,
    sizes: 'APPAREL',
    colors: {
      Burgundy: ['photo-1608975321561-176c1b187d24', 'photo-1642886512785-b5fee9faad7f'],
      Navy: ['photo-1714023498660-e4c470b285b7'],
    },
    collections: ['the-essentials', 'autumn-winter-26'],
    description:
      'A fine-gauge turtleneck in extra-fine merino. Lightweight, temperature regulating and smooth enough to wear under tailoring.',
    details: ['Slim fit', '18-gauge knit', 'Ribbed roll neck', 'Fully fashioned'],
    materials: '100% extra-fine merino wool, 17.5 micron.',
    care: CASHMERE_CARE,
  },
  {
    name: 'Breton Stripe Sweater',
    category: 'men-knitwear',
    gender: 'MEN',
    price: 180,
    sizes: 'APPAREL',
    colors: {
      Oatmeal: ['photo-1615851947829-3641ababa187'],
    },
    collections: ['weekend-edit'],
    description:
      'A heavyweight cotton knit with a nautical stripe, boat neck and slightly cropped body. A wardrobe classic made in Brittany.',
    details: ['Regular fit', 'Boat neckline', 'Ribbed cuffs', 'Made in France'],
    materials: '100% organic cotton.',
    care: COTTON_CARE,
  },
  {
    name: 'Oxford Button-Down Shirt',
    category: 'men-shirts',
    gender: 'MEN',
    price: 145,
    sizes: 'APPAREL',
    colors: {
      Sky: ['photo-1620012253295-c15cc3e65df4', 'photo-1624835567150-0c530a20d8cc', 'photo-1604695573706-53170668f6a6'],
      White: ['photo-1621072156002-e2fccdc0b176', 'photo-1627686011747-74adda3d2343'],
    },
    collections: ['the-essentials'],
    bestSeller: true,
    description:
      'A soft, substantial Oxford cloth with a classic unlined button-down collar and a back box pleat. Gets better with every wash.',
    details: ['Regular fit', 'Button-down collar', 'Back box pleat and locker loop', 'Single-needle stitching'],
    materials: '100% cotton Oxford cloth, woven in Portugal.',
    care: COTTON_CARE,
  },
  {
    name: 'Gingham Poplin Shirt',
    category: 'men-shirts',
    gender: 'MEN',
    price: 135,
    sizes: 'APPAREL',
    colors: {
      Sky: ['photo-1626557981101-aae6f84aa6ff', 'photo-1618786177957-29d9b6b26d8a'],
    },
    collections: ['weekend-edit'],
    description: 'A crisp micro-gingham poplin with a semi-cutaway collar. Smart enough for the office, relaxed enough for the weekend.',
    details: ['Regular fit', 'Semi-cutaway collar', 'Mother-of-pearl buttons'],
    materials: '100% cotton poplin.',
    care: COTTON_CARE,
  },
  {
    name: 'Heavyweight Tee',
    category: 'men-tshirts-sweats',
    gender: 'MEN',
    price: 70,
    sizes: 'APPAREL',
    colors: {
      White: ['photo-1627225924765-552d49cf47ad', 'photo-1592994238317-fcf75c5466fd', 'photo-1574180566232-aaad1b5b8450'],
      Black: ['photo-1666358777322-a25eda95848f', 'photo-1583743814966-8936f5b7be1a'],
    },
    collections: ['the-essentials', 'weekend-edit'],
    bestSeller: true,
    description:
      'A boxy, heavyweight tee in dense 240 gsm jersey. A thick ribbed neckline that never stretches out, and a slightly dropped shoulder.',
    details: ['Boxy fit', '240 gsm combed cotton', 'Thick ribbed collar', 'Pre-shrunk'],
    materials: '100% organic cotton jersey, knitted in Portugal.',
    care: COTTON_CARE,
  },
  {
    name: 'Loopback Hoodie',
    category: 'men-tshirts-sweats',
    gender: 'MEN',
    price: 150,
    sizes: 'APPAREL',
    colors: {
      Charcoal: ['photo-1632073143817-8cd5b2165e20'],
      Black: ['photo-1573156555591-189ac70df8fb', 'photo-1593516980330-bfb7210cd9e1'],
    },
    collections: ['weekend-edit'],
    description: 'Japanese loopback cotton with a double-layered hood and flat drawcords. Structured, soft and built for daily wear.',
    details: ['Relaxed fit', 'Double-layer hood', 'Kangaroo pocket', 'Ribbed cuffs and hem'],
    materials: '100% cotton loopback, 420 gsm.',
    care: COTTON_CARE,
  },
  {
    name: 'Selvedge Denim Jeans',
    category: 'men-denim-trousers',
    gender: 'MEN',
    price: 240,
    sizes: 'WAIST',
    colors: {
      Indigo: ['photo-1555689502-c4b22d76c56f', 'photo-1602293589930-45aad59ba3ab', 'photo-1541840031508-326b77c9a17e', 'photo-1715758890151-2c15d5d482aa'],
    },
    collections: ['the-essentials'],
    bestSeller: true,
    description:
      'Raw 14oz Japanese selvedge denim in a straight, slightly tapered leg. Designed to be worn hard and fade to a pattern uniquely yours.',
    details: ['Straight tapered fit', 'Button fly', 'Copper rivets', 'Selvedge out-seam', 'Inseam: 84 cm'],
    materials: '100% cotton selvedge denim, 14oz, milled in Okayama.',
    care: DENIM_CARE,
  },
  {
    name: 'Tailored Chinos',
    category: 'men-denim-trousers',
    gender: 'MEN',
    price: 175,
    sizes: 'WAIST',
    colors: {
      Stone: ['photo-1787045098569-2e17ae871df4'],
      Black: ['photo-1584865288642-42078afe6942'],
    },
    collections: ['the-essentials'],
    description: 'Cotton twill chinos with a mid rise and a tailored taper. Finished with a clean waistband and slanted pockets.',
    details: ['Tapered fit', 'Mid rise', 'Zip fly', 'Brushed twill'],
    materials: '98% cotton, 2% elastane.',
    care: COTTON_CARE,
  },

  /* ──────────────────────────────── ACCESSORIES ──────────────────────────────── */
  {
    name: 'The Atelier Tote',
    category: 'bags',
    gender: 'WOMEN',
    price: 650,
    sizes: 'ONE_SIZE',
    colors: {
      Chocolate: ['photo-1598532163257-ae3c6b2524b6', 'photo-1624687943971-e86af76d57de', 'photo-1596552639068-99bd471b579c'],
      Black: ['photo-1664187284276-2f3254cdc7dc', 'photo-1702326626601-74d2e86922b4'],
    },
    collections: ['autumn-winter-26'],
    featured: true,
    bestSeller: true,
    description:
      'Our most-loved bag. Structured vegetable-tanned leather with hand-painted edges, an internal zip pocket and room for a 14" laptop.',
    details: ['W 38 × H 29 × D 14 cm', 'Hand-painted edges', 'Internal zip pocket', 'Detachable pouch', 'Made in Florence'],
    materials: '100% vegetable-tanned calf leather. Lining: suede.',
    care: LEATHER_CARE,
  },
  {
    name: 'Mini Crossbody Bag',
    category: 'bags',
    gender: 'WOMEN',
    price: 380,
    sizes: 'ONE_SIZE',
    colors: {
      Charcoal: ['photo-1559563458-527698bf5295'],
      Black: ['photo-1603219527847-24c87f552a77'],
    },
    isNew: true,
    description: 'A compact crossbody in pebbled leather with an adjustable strap and a magnetic flap closure. Fits a phone, cards and keys.',
    details: ['W 20 × H 14 × D 6 cm', 'Adjustable strap', 'Magnetic closure'],
    materials: '100% pebbled calf leather.',
    care: LEATHER_CARE,
  },
  {
    name: 'Leather Weekender',
    category: 'bags',
    gender: 'UNISEX',
    price: 720,
    sizes: 'ONE_SIZE',
    colors: {
      Black: ['photo-1758542988969-39a10168b2ce'],
    },
    collections: ['weekend-edit'],
    description: 'A generous travel duffel in full-grain leather with brass hardware, a detachable shoulder strap and a separate shoe compartment.',
    details: ['W 52 × H 30 × D 26 cm', 'Separate shoe compartment', 'Brass hardware', 'Cabin-size compliant'],
    materials: '100% full-grain leather. Lining: cotton canvas.',
    care: LEATHER_CARE,
  },
  {
    name: 'Goodyear Lace-Up Boots',
    category: 'footwear',
    gender: 'MEN',
    price: 460,
    sizes: 'SHOE_M',
    colors: {
      Chocolate: ['photo-1608256246200-53e635b5b65f', 'photo-1599012307605-23a0ebe4d321', 'photo-1605812860427-4024433a70fd'],
      Black: ['photo-1613673720017-56e42d90fee4'],
    },
    collections: ['autumn-winter-26'],
    bestSeller: true,
    description:
      'Built on a Goodyear-welted construction so they can be resoled for decades. Waxed calf uppers and a commando sole for grip in all weathers.',
    details: ['Goodyear welted', 'Commando rubber sole', 'Leather lining', 'Made in Portugal'],
    materials: 'Upper: waxed calf leather. Sole: rubber.',
    care: 'Brush after wear, condition monthly and use cedar shoe trees.',
  },
  {
    name: 'Slouch Leather Boots',
    category: 'footwear',
    gender: 'WOMEN',
    price: 540,
    sizes: 'SHOE_W',
    colors: {
      Black: ['photo-1763661300203-aa3e2702f510'],
    },
    collections: ['autumn-winter-26'],
    isNew: true,
    description: 'Soft, slouched knee-high boots in supple nappa with a sculpted 6 cm block heel. Pull-on with a hidden inner zip.',
    details: ['6 cm block heel', 'Hidden inner zip', 'Leather sole with rubber insert', 'Made in Italy'],
    materials: '100% nappa leather.',
    care: 'Wipe clean with a soft cloth. Store stuffed to maintain shape.',
  },
  {
    name: 'Leather Derby Shoes',
    category: 'footwear',
    gender: 'MEN',
    price: 390,
    sizes: 'SHOE_M',
    colors: {
      Chocolate: ['photo-1490114538077-0a7f8cb49891'],
    },
    collections: ['atelier-tailoring'],
    description: 'Hand-burnished calf derbies with a sleek almond toe and a Blake-stitched leather sole. Pairs equally well with suits and denim.',
    details: ['Blake stitched', 'Leather sole', 'Hand-burnished finish'],
    materials: '100% calf leather.',
    care: 'Polish regularly and use shoe trees.',
  },
];

export const banners = [
  {
    placement: 'HERO' as const,
    eyebrow: 'Autumn / Winter 26',
    title: 'The Art of Restraint',
    subtitle: 'Double-faced wool, brushed cashmere and supple leather — a new season of quiet confidence.',
    ctaLabel: 'Discover the collection',
    ctaHref: '/collections/autumn-winter-26',
    image: 'photo-1603189343302-e603f7add05a',
    mobileImage: 'photo-1653875842174-429c1b467548',
    theme: 'LIGHT' as const,
  },
  {
    placement: 'HERO' as const,
    eyebrow: 'Women',
    title: 'Outerwear, Reconsidered',
    subtitle: 'Coats cut to be worn for decades.',
    ctaLabel: 'Shop coats',
    ctaHref: '/category/women-coats-jackets',
    image: 'photo-1645561305502-63a9ba09ab09',
    mobileImage: 'photo-1539533113208-f6df8cc8b543',
    theme: 'DARK' as const,
  },
  {
    placement: 'HERO' as const,
    eyebrow: 'Men',
    title: 'Modern Tailoring',
    subtitle: 'Half-canvassed suits in Italian wool, made to move.',
    ctaLabel: 'Shop menswear',
    ctaHref: '/category/men',
    image: 'photo-1507680434567-5739c80be1ac',
    mobileImage: 'photo-1617137968427-85924c800a22',
    theme: 'DARK' as const,
  },
  {
    placement: 'PROMO' as const,
    eyebrow: 'The Coat Edit',
    title: 'Wrapped in Wool',
    subtitle: 'Enjoy complimentary shipping and returns on all outerwear this season.',
    ctaLabel: 'Shop outerwear',
    ctaHref: '/shop?category=women-coats-jackets',
    image: 'photo-1514813836041-518668f092b1',
    mobileImage: 'photo-1550872199-63f4382fe925',
    theme: 'DARK' as const,
  },
];
