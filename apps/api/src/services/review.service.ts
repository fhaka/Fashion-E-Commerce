import type { Prisma } from '@prisma/client';
import type { ReviewInput } from '@maison/shared';
import { prisma, type Tx } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { pageMeta, paginate, sanitizeText } from '../utils/helpers';

const PURCHASED_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

export async function listReviews(
  slug: string,
  q: { sort: 'newest' | 'highest' | 'lowest'; rating?: number; page: number; limit: number },
) {
  const product = await prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true } });
  if (!product) throw ApiError.notFound('Product not found');

  const where: Prisma.ReviewWhereInput = { productId: product.id, status: 'APPROVED', ...(q.rating ? { rating: q.rating } : {}) };
  const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
    q.sort === 'highest' ? [{ rating: 'desc' }, { createdAt: 'desc' }] : q.sort === 'lowest' ? [{ rating: 'asc' }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }];

  const [total, rows] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy,
      ...paginate(q.page, q.limit),
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return {
    data: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      fit: r.fit,
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt,
      // Privacy: first name + last initial only.
      author: `${r.user.firstName} ${r.user.lastName.charAt(0)}.`,
    })),
    meta: pageMeta(total, q.page, q.limit),
  };
}

export async function createReview(userId: string, slug: string, input: ReviewInput) {
  const product = await prisma.product.findFirst({ where: { slug, status: 'ACTIVE' }, select: { id: true } });
  if (!product) throw ApiError.notFound('Product not found');

  const existing = await prisma.review.findUnique({ where: { productId_userId: { productId: product.id, userId } } });
  if (existing) throw ApiError.conflict('You have already reviewed this product');

  const purchased = await prisma.orderItem.findFirst({
    where: { productId: product.id, order: { userId, status: { in: [...PURCHASED_STATUSES] } } },
    select: { id: true },
  });

  const review = await prisma.review.create({
    data: {
      productId: product.id,
      userId,
      rating: input.rating,
      title: sanitizeText(input.title),
      body: sanitizeText(input.body),
      fit: input.fit ?? null,
      isVerifiedPurchase: !!purchased,
      status: 'PENDING', // moderated in the admin dashboard
    },
  });
  return { id: review.id, status: review.status };
}

/** Recalculates the denormalised rating on a product. Call after any review status change. */
export async function refreshProductRating(productId: string, tx: Tx | typeof prisma = prisma) {
  const agg = await tx.review.aggregate({ where: { productId, status: 'APPROVED' }, _avg: { rating: true }, _count: true });
  await tx.product.update({
    where: { id: productId },
    data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10, ratingCount: agg._count },
  });
}

export async function canReview(userId: string, slug: string) {
  const product = await prisma.product.findFirst({ where: { slug }, select: { id: true } });
  if (!product) throw ApiError.notFound('Product not found');
  const existing = await prisma.review.findUnique({ where: { productId_userId: { productId: product.id, userId } }, select: { status: true } });
  return { canReview: !existing, existingStatus: existing?.status ?? null };
}
