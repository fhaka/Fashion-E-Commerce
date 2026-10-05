/* eslint-disable no-console */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Prisma, PrismaClient, type OrderStatus } from '@prisma/client';
import { banners, categories, collections, colors, products, sizeGroups } from './catalog';
import { brandImages, editorialImages, img } from './images';
import { MAISON_PAGES, MAISON_SETTINGS } from './brand';

const prisma = new PrismaClient();

/* Deterministic PRNG so every seed produces the same store. */
let seed = 20261001;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ORDER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const orderNumber = () => 'MS-' + Array.from({ length: 8 }, () => ORDER_ALPHABET[int(0, ORDER_ALPHABET.length - 1)]).join('');

const FIRST = ['Ava', 'Louis', 'Chloé', 'Noah', 'Isabella', 'Hugo', 'Mia', 'Theo', 'Elena', 'Lucas', 'Sofia', 'Oscar', 'Camille', 'Leo', 'Amelia', 'Jules', 'Grace', 'Felix', 'Clara', 'Arthur', 'Nina', 'Adrian', 'Zoé', 'Henry', 'Iris', 'Max', 'Léa', 'Samuel', 'Margot', 'Elliot'];
const LAST = ['Laurent', 'Bennett', 'Moreau', 'Hartley', 'Rossi', 'Dubois', 'Whitmore', 'Fischer', 'Sinclair', 'Marchetti', 'Holloway', 'Lefèvre', 'Ashford', 'Romano', 'Kensington', 'Blanchard', 'Delacroix', 'Thornton', 'Vidal', 'Carrington'];
const CITIES = [
  { city: 'New York', state: 'NY', postalCode: '10013', country: 'US' },
  { city: 'Los Angeles', state: 'CA', postalCode: '90026', country: 'US' },
  { city: 'Chicago', state: 'IL', postalCode: '60611', country: 'US' },
  { city: 'Austin', state: 'TX', postalCode: '78701', country: 'US' },
  { city: 'Seattle', state: 'WA', postalCode: '98101', country: 'US' },
  { city: 'Boston', state: 'MA', postalCode: '02116', country: 'US' },
  { city: 'Miami', state: 'FL', postalCode: '33139', country: 'US' },
  { city: 'San Francisco', state: 'CA', postalCode: '94110', country: 'US' },
];
const STREETS = ['Greene Street', 'Sunset Boulevard', 'Oak Street', 'Congress Avenue', 'Pike Street', 'Newbury Street', 'Collins Avenue', 'Valencia Street', 'Mercer Street', 'Elm Avenue'];

const REVIEW_TEMPLATES: Array<{ rating: number; title: string; body: string; fit: 'RUNS_SMALL' | 'TRUE_TO_SIZE' | 'RUNS_LARGE' }> = [
  { rating: 5, title: 'Worth every penny', body: 'The quality is exceptional — you can feel it the moment you take it out of the box. The fabric is substantial and the finishing is immaculate. Already planning my next order.', fit: 'TRUE_TO_SIZE' },
  { rating: 5, title: 'My new favourite piece', body: 'I have worn this almost every day since it arrived. It looks expensive without trying too hard and it goes with everything in my wardrobe.', fit: 'TRUE_TO_SIZE' },
  { rating: 5, title: 'Beautifully made', body: 'Lovely weight, perfect drape and the colour is exactly as pictured. Packaging was gorgeous too — it felt like a proper luxury purchase.', fit: 'TRUE_TO_SIZE' },
  { rating: 4, title: 'Great quality, slightly roomy', body: 'Excellent fabric and construction. The fit is a little generous, so I would consider sizing down if you prefer a closer cut.', fit: 'RUNS_LARGE' },
  { rating: 4, title: 'Elegant and versatile', body: 'Really pleased with this. It dresses up and down easily. Took off one star only because delivery took a day longer than expected.', fit: 'TRUE_TO_SIZE' },
  { rating: 4, title: 'Runs a touch small', body: 'Gorgeous piece and very well finished, but I had to exchange for the next size up. The exchange process was quick and painless.', fit: 'RUNS_SMALL' },
  { rating: 3, title: 'Nice, but not perfect for me', body: 'The material is lovely, but the cut did not quite suit my frame. Customer service were very helpful with the return.', fit: 'RUNS_LARGE' },
  { rating: 5, title: 'Timeless', body: 'Exactly what I was looking for: understated, beautifully cut and clearly built to last. Compliments every time I wear it.', fit: 'TRUE_TO_SIZE' },
];

async function clear() {
  // Order matters: children before parents.
  await prisma.$transaction([
    prisma.couponRedemption.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderStatusEvent.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.review.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.wishlistItem.deleteMany(),
    prisma.wishlist.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.productCollection.deleteMany(),
    prisma.product.deleteMany(),
    prisma.collection.deleteMany(),
    prisma.category.updateMany({ data: { parentId: null } }),
    prisma.category.deleteMany(),
    prisma.size.deleteMany(),
    prisma.color.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.banner.deleteMany(),
    prisma.newsletterSubscriber.deleteMany(),
    prisma.contactMessage.deleteMany(),
    prisma.address.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

/**
 * The seed starts by deleting everything. In production that must never hit a live shop:
 * refuse if there are already orders unless SEED_ALLOW_RESET=true is set explicitly.
 */
async function guardAgainstWipingRealData() {
  if (process.env.NODE_ENV !== 'production' || process.env.SEED_ALLOW_RESET === 'true') return;
  const orders = await prisma.order.count();
  if (orders > 0) {
    console.error(`❌ Refusing to seed: this production database already has ${orders} order(s) and seeding deletes all data.`);
    console.error('   Set SEED_ALLOW_RESET=true only if you really want to wipe it.');
    process.exit(1);
  }
}

async function main() {
  const started = Date.now();
  console.log('🌱 Seeding Maison…');
  await guardAgainstWipingRealData();
  await clear();

  /* ── Sizes & colours ── */
  const sizeIds: Record<string, Record<string, string>> = {};
  for (const [group, labels] of Object.entries(sizeGroups)) {
    sizeIds[group] = {};
    for (const [i, label] of labels.entries()) {
      const s = await prisma.size.create({ data: { group, label, sortOrder: i } });
      sizeIds[group][label] = s.id;
    }
  }
  const colorIds: Record<string, string> = {};
  for (const c of colors) {
    const row = await prisma.color.create({ data: { name: c.name, hex: c.hex, slug: slugify(c.name) } });
    colorIds[c.name] = row.id;
  }

  /* ── Categories ── */
  const categoryIds: Record<string, string> = {};
  for (const [i, root] of categories.entries()) {
    const parent = await prisma.category.create({
      data: { name: root.name, slug: root.slug, description: root.description, image: root.image, sortOrder: i },
    });
    categoryIds[root.slug] = parent.id;
    for (const [j, child] of (root.children ?? []).entries()) {
      const c = await prisma.category.create({
        data: { ...child, parentId: parent.id, sortOrder: j },
      });
      categoryIds[child.slug] = c.id;
    }
  }

  /* ── Collections ── */
  const collectionIds: Record<string, string> = {};
  for (const [i, c] of collections.entries()) {
    const row = await prisma.collection.create({ data: { ...c, sortOrder: i } });
    collectionIds[c.slug] = row.id;
  }

  /* ── Products, images, variants, inventory ── */
  type VariantInfo = { id: string; productId: string; price: number; label: string; sku: string; image: string; name: string; slug: string };
  const allVariants: VariantInfo[] = [];
  const productIds: string[] = [];
  const now = Date.now();

  for (const [pi, p] of products.entries()) {
    const slug = slugify(p.name);
    const code = p.name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 4);
    const colorEntries = Object.entries(p.colors) as [string, string[]][];

    const product = await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: p.description,
        details: p.details,
        materials: p.materials,
        care: p.care,
        basePrice: p.price * 100,
        compareAtPrice: p.compareAt ? p.compareAt * 100 : null,
        gender: p.gender,
        status: 'ACTIVE',
        isFeatured: !!p.featured,
        isBestSeller: !!p.bestSeller,
        isNew: !!p.isNew,
        videoUrl: p.videoUrl ?? null,
        seoTitle: `${p.name} | Maison`,
        seoDescription: p.description.slice(0, 155),
        categoryId: categoryIds[p.category],
        // Stagger creation dates so "newest" sorting is meaningful; new-in pieces are most recent.
        createdAt: new Date(now - (p.isNew ? int(1, 10) : int(15, 200)) * 86_400_000 - pi * 60_000),
        collections: {
          create: (p.collections ?? []).map((slug, i) => ({ collectionId: collectionIds[slug], sortOrder: i })),
        },
        images: {
          create: colorEntries.flatMap(([colorName, ids], ci) =>
            ids.map((id, ii) => ({
              url: img(id),
              alt: `${p.name} in ${colorName.toLowerCase()} — view ${ii + 1}`,
              colorId: colorIds[colorName],
              sortOrder: ci * 10 + ii,
            })),
          ),
        },
      },
    });
    productIds.push(product.id);

    for (const [colorName, ids] of colorEntries) {
      for (const sizeLabel of sizeGroups[p.sizes]) {
        const sku = `MS-${code}-${slugify(colorName).slice(0, 3).toUpperCase()}-${sizeLabel.replace(/\s+/g, '').toUpperCase()}`;
        // Realistic stock curve: middle sizes deeper, some sold out, some low.
        const roll = rand();
        const qty = roll < 0.08 ? 0 : roll < 0.2 ? int(1, 4) : int(6, 40);
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sizeId: sizeIds[p.sizes][sizeLabel],
            colorId: colorIds[colorName],
            sku,
            inventory: { create: { quantity: qty, lowStockThreshold: 5 } },
            movements: { create: { delta: qty, reason: 'INITIAL', note: 'Seed stock' } },
          },
        });
        allVariants.push({
          id: variant.id,
          productId: product.id,
          price: p.price * 100,
          label: `${colorName} / ${sizeLabel}`,
          sku,
          image: img(ids[0], 600),
          name: p.name,
          slug,
        });
      }
    }
  }
  console.log(`   ✓ ${products.length} products, ${allVariants.length} variants`);

  /* ── Users ── */
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@maison.test';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';
  const [adminHash, customerHash] = await Promise.all([bcrypt.hash(adminPassword, 12), bcrypt.hash('Customer123!', 12)]);

  await prisma.user.create({
    data: { email: adminEmail, passwordHash: adminHash, firstName: 'Margaux', lastName: 'Admin', role: 'ADMIN' },
  });

  const demo = await prisma.user.create({
    data: {
      email: 'ava@maison.test',
      passwordHash: customerHash,
      firstName: 'Ava',
      lastName: 'Laurent',
      phone: '+1 212 555 0142',
      addresses: {
        create: [
          { label: 'Home', fullName: 'Ava Laurent', line1: '118 Greene Street', line2: 'Apt 4F', city: 'New York', state: 'NY', postalCode: '10012', country: 'US', phone: '+1 212 555 0142', isDefault: true },
          { label: 'Studio', fullName: 'Ava Laurent', line1: '45 Mercer Street', city: 'New York', state: 'NY', postalCode: '10013', country: 'US' },
        ],
      },
    },
  });

  const customers = [demo];
  for (let i = 0; i < 40; i++) {
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7) % LAST.length];
    const loc = pick(CITIES);
    const u = await prisma.user.create({
      data: {
        email: `${slugify(first)}.${slugify(last)}${i}@example.com`,
        passwordHash: customerHash,
        firstName: first,
        lastName: last,
        createdAt: new Date(now - int(5, 360) * 86_400_000),
        addresses: {
          create: {
            label: 'Home',
            fullName: `${first} ${last}`,
            line1: `${int(10, 980)} ${pick(STREETS)}`,
            ...loc,
            isDefault: true,
          },
        },
      },
    });
    customers.push(u);
  }
  console.log(`   ✓ ${customers.length + 1} users (admin: ${adminEmail})`);

  /* ── Store settings & content pages (the Maison demo brand) ── */
  const settingsData = { ...MAISON_SETTINGS, socialLinks: MAISON_SETTINGS.socialLinks as Prisma.InputJsonValue, storyStats: MAISON_SETTINGS.storyStats as Prisma.InputJsonValue };
  await prisma.storeSettings.upsert({ where: { id: 1 }, create: { id: 1, ...settingsData }, update: settingsData });
  for (const [slug, page] of Object.entries(MAISON_PAGES)) {
    await prisma.contentPage.upsert({ where: { slug }, create: { slug, ...page }, update: page });
  }
  console.log('   ✓ store settings and pages');

  /* ── Coupons ── */
  const day = 86_400_000;
  await prisma.coupon.createMany({
    data: [
      { code: 'WELCOME10', description: '10% off your first order', type: 'PERCENT', value: 10, perUserLimit: 1, isActive: true },
      { code: 'FREESHIP', description: 'Complimentary express-equivalent shipping', type: 'FREE_SHIPPING', value: 0, minSubtotal: 10000, isActive: true },
      { code: 'SAVE50', description: '$50 off orders over $400', type: 'FIXED', value: 5000, minSubtotal: 40000, isActive: true },
      { code: 'VIP20', description: 'Private client 20% off', type: 'PERCENT', value: 20, maxUses: 100, endsAt: new Date(now + 60 * day), isActive: true },
      { code: 'SUMMER25', description: 'Expired summer promotion', type: 'PERCENT', value: 25, startsAt: new Date(now - 120 * day), endsAt: new Date(now - 30 * day), isActive: true },
    ],
  });
  const coupons = await prisma.coupon.findMany();
  const couponByCode = Object.fromEntries(coupons.map((c) => [c.code, c]));

  /* ── Orders (last ~180 days) ── */
  const salesByProduct: Record<string, number> = {};
  const purchased = new Set<string>(); // userId:productId for verified reviews
  const ORDER_COUNT = 220;
  for (let i = 0; i < ORDER_COUNT; i++) {
    const customer = i < 6 ? demo : pick(customers);
    const ageDays = Math.pow(rand(), 1.4) * 180; // skew toward recent orders
    const createdAt = new Date(now - ageDays * day - int(0, 86_000) * 1000);
    const lineCount = chance(0.55) ? 1 : chance(0.7) ? 2 : 3;
    const lines = new Map<string, { v: VariantInfo; qty: number }>();
    for (let l = 0; l < lineCount; l++) {
      const v = pick(allVariants);
      lines.set(v.id, { v, qty: chance(0.85) ? 1 : 2 });
    }
    const items = [...lines.values()];
    const subtotal = items.reduce((s, { v, qty }) => s + v.price * qty, 0);
    const couponCode = chance(0.18) ? pick(['WELCOME10', 'SAVE50', 'VIP20', 'FREESHIP']) : null;
    const coupon = couponCode ? couponByCode[couponCode] : null;
    let discount = 0;
    let shipping = subtotal >= 25000 ? 0 : 1200;
    if (coupon?.type === 'PERCENT') discount = Math.round((subtotal * coupon.value) / 100);
    if (coupon?.type === 'FIXED' && subtotal >= (coupon.minSubtotal ?? 0)) discount = coupon.value;
    if (coupon?.type === 'FREE_SHIPPING') shipping = 0;
    const tax = Math.round((subtotal - discount) * 0.08);
    const total = subtotal - discount + shipping + tax;

    let status: OrderStatus;
    if (ageDays > 14) status = chance(0.06) ? 'CANCELLED' : chance(0.03) ? 'REFUNDED' : 'DELIVERED';
    else if (ageDays > 6) status = chance(0.7) ? 'DELIVERED' : 'SHIPPED';
    else if (ageDays > 2) status = chance(0.6) ? 'SHIPPED' : 'PROCESSING';
    else status = chance(0.5) ? 'PROCESSING' : 'PAID';

    const timeline: OrderStatus[] = ['PENDING', 'PAID'];
    if (['PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUNDED'].includes(status)) timeline.push('PROCESSING');
    if (['SHIPPED', 'DELIVERED', 'REFUNDED'].includes(status)) timeline.push('SHIPPED');
    if (['DELIVERED', 'REFUNDED'].includes(status)) timeline.push('DELIVERED');
    if (status === 'REFUNDED') timeline.push('REFUNDED');
    if (status === 'CANCELLED') timeline.push('CANCELLED');

    const address = await prisma.address.findFirst({ where: { userId: customer.id, isDefault: true } });
    const snapshot = address
      ? { fullName: address.fullName, line1: address.line1, line2: address.line2, city: address.city, state: address.state, postalCode: address.postalCode, country: address.country, phone: address.phone }
      : {};
    const hour = 3_600_000;
    const at = (n: number) => new Date(createdAt.getTime() + n * 18 * hour);
    const shippedIdx = timeline.indexOf('SHIPPED');
    const deliveredIdx = timeline.indexOf('DELIVERED');

    const order = await prisma.order.create({
      data: {
        orderNumber: orderNumber(),
        userId: customer.id,
        email: customer.email,
        status,
        subtotal,
        discountTotal: discount,
        shippingTotal: shipping,
        taxTotal: tax,
        total,
        shippingMethod: shipping === 0 && !coupon ? 'standard' : chance(0.2) ? 'express' : 'standard',
        shippingAddress: snapshot as Prisma.InputJsonValue,
        couponId: coupon?.id,
        couponCode: coupon?.code,
        trackingNumber: shippedIdx >= 0 ? `1Z${int(100000, 999999)}${int(1000000, 9999999)}` : null,
        carrier: shippedIdx >= 0 ? pick(['UPS', 'FedEx', 'DHL Express']) : null,
        paidAt: at(0),
        shippedAt: shippedIdx >= 0 ? at(shippedIdx) : null,
        deliveredAt: deliveredIdx >= 0 ? at(deliveredIdx + 2) : null,
        cancelledAt: status === 'CANCELLED' ? at(1) : null,
        createdAt,
        updatedAt: at(timeline.length),
        items: {
          create: items.map(({ v, qty }) => ({
            variantId: v.id,
            productId: v.productId,
            productName: v.name,
            productSlug: v.slug,
            variantLabel: v.label,
            sku: v.sku,
            image: v.image,
            unitPrice: v.price,
            quantity: qty,
            lineTotal: v.price * qty,
          })),
        },
        payments: {
          create: {
            provider: 'mock',
            providerRef: `mock_pi_${order_ref()}`,
            amount: total,
            status: status === 'REFUNDED' ? 'REFUNDED' : status === 'CANCELLED' ? 'REFUNDED' : 'SUCCEEDED',
            createdAt,
          },
        },
        events: {
          create: timeline.map((s, idx) => ({
            status: s,
            createdAt: s === 'DELIVERED' ? at(idx + 2) : at(idx),
            note:
              s === 'PENDING' ? 'Order placed' :
              s === 'PAID' ? 'Payment confirmed' :
              s === 'PROCESSING' ? 'Your order is being prepared in our atelier' :
              s === 'SHIPPED' ? 'Handed to carrier' :
              s === 'DELIVERED' ? 'Delivered' :
              s === 'CANCELLED' ? 'Cancelled at customer request' : 'Refund issued',
          })),
        },
      },
    });

    if (coupon) {
      await prisma.couponRedemption.create({ data: { couponId: coupon.id, orderId: order.id, userId: customer.id, email: customer.email } });
      await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    }
    if (status !== 'CANCELLED' && status !== 'REFUNDED') {
      for (const { v, qty } of items) {
        salesByProduct[v.productId] = (salesByProduct[v.productId] ?? 0) + qty;
        purchased.add(`${customer.id}:${v.productId}`);
      }
    }
  }
  for (const [productId, salesCount] of Object.entries(salesByProduct)) {
    await prisma.product.update({ where: { id: productId }, data: { salesCount } });
  }
  console.log(`   ✓ ${ORDER_COUNT} orders`);

  /* ── Reviews ── */
  let reviewCount = 0;
  for (const productId of productIds) {
    const n = int(2, 7);
    const reviewers = [...customers].sort(() => rand() - 0.5).slice(0, n);
    for (const [ri, user] of reviewers.entries()) {
      const t = pick(REVIEW_TEMPLATES);
      await prisma.review.create({
        data: {
          productId,
          userId: user.id,
          rating: t.rating,
          title: t.title,
          body: t.body,
          fit: t.fit,
          isVerifiedPurchase: purchased.has(`${user.id}:${productId}`) || chance(0.6),
          status: ri === n - 1 && chance(0.25) ? 'PENDING' : 'APPROVED',
          createdAt: new Date(now - int(1, 150) * day),
        },
      });
      reviewCount++;
    }
    const agg = await prisma.review.aggregate({
      where: { productId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });
    await prisma.product.update({
      where: { id: productId },
      data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
    });
  }
  console.log(`   ✓ ${reviewCount} reviews`);

  /* ── Banners (hero, promo, editorial lookbook) ── */
  for (const [i, b] of banners.entries()) {
    await prisma.banner.create({
      data: { ...b, image: img(b.image, 2400), mobileImage: img(b.mobileImage, 1200), sortOrder: i },
    });
  }
  for (const [i, e] of editorialImages.entries()) {
    await prisma.banner.create({
      data: {
        placement: 'EDITORIAL',
        title: e.title,
        subtitle: e.subtitle,
        eyebrow: `Look ${String(i + 1).padStart(2, '0')}`,
        ctaLabel: 'Shop the look',
        ctaHref: '/collections/autumn-winter-26',
        image: img(e.id, 1400),
        sortOrder: i,
      },
    });
  }
  // Brand story section on the home page — editable by admins like any other banner.
  await prisma.banner.create({
    data: {
      placement: 'STORY',
      title: 'Made slowly, worn for years',
      eyebrow: 'Our Atelier',
      subtitle:
        'Every Maison piece begins in our Paris atelier, where patterns are drafted by hand and refined over dozens of fittings. We work with family-run mills in Italy, Scotland and Portugal, choosing natural fibres that grow more beautiful with age.',
      ctaLabel: 'Our story',
      ctaHref: '/about',
      image: brandImages.atelier,
      mobileImage: brandImages.workshop,
      sortOrder: 0,
    },
  });

  /* ── Newsletter ── */
  await prisma.newsletterSubscriber.createMany({
    data: customers.slice(0, 28).map((c, i) => ({
      email: c.email,
      source: pick(['footer', 'popup', 'checkout', 'register']),
      createdAt: new Date(now - int(1, 300) * day),
      status: i % 9 === 8 ? 'UNSUBSCRIBED' : 'SUBSCRIBED',
    })),
  });

  /* ── Demo customer wishlist ── */
  await prisma.wishlist.create({
    data: {
      userId: demo.id,
      items: { create: productIds.slice(0, 4).map((productId) => ({ productId })) },
    },
  });

  console.log(`✅ Seed complete in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`   Admin:    ${adminEmail} / ${adminPassword}`);
  console.log('   Customer: ava@maison.test / Customer123!');
}

function order_ref() {
  return Array.from({ length: 16 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[int(0, 35)]).join('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
