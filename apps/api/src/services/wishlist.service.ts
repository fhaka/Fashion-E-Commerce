import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { productCardInclude, toProductCard } from './serializers';

export async function getWishlist(userId: string) {
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        orderBy: { createdAt: 'desc' },
        where: { product: { status: 'ACTIVE' } },
        include: { product: { include: productCardInclude } },
      },
    },
  });
  return (wishlist?.items ?? []).map((i) => ({ ...toProductCard(i.product), addedAt: i.createdAt }));
}

export async function getWishlistIds(userId: string) {
  const items = await prisma.wishlistItem.findMany({ where: { wishlist: { userId } }, select: { productId: true } });
  return items.map((i) => i.productId);
}

export async function addToWishlist(userId: string, productId: string) {
  const product = await prisma.product.findFirst({ where: { id: productId, status: 'ACTIVE' }, select: { id: true } });
  if (!product) throw ApiError.notFound('Product not found');
  const wishlist = await prisma.wishlist.upsert({ where: { userId }, create: { userId }, update: {} });
  await prisma.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    create: { wishlistId: wishlist.id, productId },
    update: {},
  });
  return getWishlistIds(userId);
}

export async function removeFromWishlist(userId: string, productId: string) {
  await prisma.wishlistItem.deleteMany({ where: { productId, wishlist: { userId } } });
  return getWishlistIds(userId);
}
