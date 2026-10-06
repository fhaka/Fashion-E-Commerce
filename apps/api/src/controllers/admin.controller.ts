import type { Request, Response } from 'express';
import { hasImageSignature, hasVideoSignature } from '../middleware/upload';
import { getStorageProvider } from '../providers/storage';
import * as merch from '../services/admin/merch.admin.service';
import * as ops from '../services/admin/operations.admin.service';
import * as products from '../services/admin/product.admin.service';
import * as stats from '../services/admin/stats.service';
import { ApiError } from '../utils/ApiError';

const actor = (req: Request) => req.user!.id;
const id = (req: Request) => req.params.id as string;

function sendCsv(res: Response, filename: string, rows: Record<string, unknown>[]) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + stats.toCsv(rows)); // BOM so Excel reads UTF-8 correctly
}

/* Dashboard & reports */
export async function overview(req: Request, res: Response) {
  res.json({ data: await stats.overview(req.valid.query.range) });
}
export async function salesReport(req: Request, res: Response) {
  const { from, to, groupBy, format } = req.valid.query;
  const report = await stats.salesReport(from, to, groupBy);
  if (format === 'csv') return sendCsv(res, `sales-${groupBy}-${from.toISOString().slice(0, 10)}.csv`, report.rows);
  res.json({ data: report });
}

/* Products */
export async function listProducts(req: Request, res: Response) {
  res.json(await products.listProducts(req.valid.query));
}
export async function getProduct(req: Request, res: Response) {
  res.json({ data: await products.getProduct(id(req)) });
}
export async function createProduct(req: Request, res: Response) {
  res.status(201).json({ data: await products.createProduct(req.valid.body, actor(req)) });
}
export async function updateProduct(req: Request, res: Response) {
  res.json({ data: await products.updateProduct(id(req), req.valid.body, actor(req)) });
}
export async function deleteProduct(req: Request, res: Response) {
  res.json({ data: await products.deleteProduct(id(req)) });
}
export async function duplicateProduct(req: Request, res: Response) {
  res.status(201).json({ data: await products.duplicateProduct(id(req), actor(req)) });
}
export async function bulkProducts(req: Request, res: Response) {
  const { ids, ...data } = req.valid.body;
  res.json({ data: await products.bulkUpdate(ids, data) });
}

/* Uploads */
export async function upload(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw ApiError.badRequest('No files received');
  for (const f of files) {
    if (!hasImageSignature(f.buffer, f.mimetype)) throw ApiError.badRequest(`${f.originalname} is not a valid image`);
  }
  const storage = getStorageProvider();
  const folder = typeof req.query.folder === 'string' && /^[a-z-]{1,30}$/.test(req.query.folder) ? req.query.folder : 'products';
  const stored = [];
  for (const f of files) stored.push(await storage.upload(f, folder));
  res.status(201).json({ data: stored });
}
export async function uploadVideo(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw ApiError.badRequest('No file received');
  if (!hasVideoSignature(file.buffer, file.mimetype)) throw ApiError.badRequest(`${file.originalname} is not a valid MP4 or WebM video`);
  res.status(201).json({ data: await getStorageProvider().upload(file, 'videos') });
}
export async function deleteUpload(req: Request, res: Response) {
  await getStorageProvider().remove(req.valid.body.publicId);
  res.status(204).end();
}

/* Inventory */
export async function listInventory(req: Request, res: Response) {
  res.json(await products.listInventory(req.valid.query));
}
export async function adjustInventory(req: Request, res: Response) {
  res.json({ data: await products.adjustInventory(req.params.variantId as string, req.valid.body, actor(req)) });
}
export async function inventoryMovements(req: Request, res: Response) {
  const { page, limit } = req.valid.query;
  res.json(await products.inventoryMovements(req.params.variantId as string, page, limit));
}
export async function lowStock(_req: Request, res: Response) {
  res.json({ data: await stats.lowStockVariants(200) });
}

/* Categories / collections / sizes / colours */
export const listCategories = async (_req: Request, res: Response) => res.json({ data: await merch.listCategories() });
export const createCategory = async (req: Request, res: Response) => res.status(201).json({ data: await merch.createCategory(req.valid.body) });
export const updateCategory = async (req: Request, res: Response) => res.json({ data: await merch.updateCategory(id(req), req.valid.body) });
export async function deleteCategory(req: Request, res: Response) {
  await merch.deleteCategory(id(req));
  res.status(204).end();
}

export const listCollections = async (_req: Request, res: Response) => res.json({ data: await merch.listCollections() });
export const getCollection = async (req: Request, res: Response) => res.json({ data: await merch.getCollection(id(req)) });
export const createCollection = async (req: Request, res: Response) => res.status(201).json({ data: await merch.createCollection(req.valid.body) });
export const updateCollection = async (req: Request, res: Response) => res.json({ data: await merch.updateCollection(id(req), req.valid.body) });
export const setCollectionProducts = async (req: Request, res: Response) =>
  res.json({ data: await merch.setCollectionProducts(id(req), req.valid.body.productIds) });
export async function deleteCollection(req: Request, res: Response) {
  await merch.deleteCollection(id(req));
  res.status(204).end();
}

export const listSizes = async (_req: Request, res: Response) => res.json({ data: await merch.listSizes() });
export const createSize = async (req: Request, res: Response) => res.status(201).json({ data: await merch.createSize(req.valid.body) });
export const updateSize = async (req: Request, res: Response) => res.json({ data: await merch.updateSize(id(req), req.valid.body) });
export async function deleteSize(req: Request, res: Response) {
  await merch.deleteSize(id(req));
  res.status(204).end();
}
export const listColors = async (_req: Request, res: Response) => res.json({ data: await merch.listColors() });
export const createColor = async (req: Request, res: Response) => res.status(201).json({ data: await merch.createColor(req.valid.body) });
export const updateColor = async (req: Request, res: Response) => res.json({ data: await merch.updateColor(id(req), req.valid.body) });
export async function deleteColor(req: Request, res: Response) {
  await merch.deleteColor(id(req));
  res.status(204).end();
}

/* Coupons */
export const listCoupons = async (_req: Request, res: Response) => res.json({ data: await merch.listCoupons() });
export const createCoupon = async (req: Request, res: Response) => res.status(201).json({ data: await merch.createCoupon(req.valid.body) });
export const updateCoupon = async (req: Request, res: Response) => res.json({ data: await merch.updateCoupon(id(req), req.valid.body) });
export const deleteCoupon = async (req: Request, res: Response) => res.json({ data: await merch.deleteCoupon(id(req)) });

/* Banners */
export const listBanners = async (req: Request, res: Response) => res.json({ data: await merch.listBanners(req.valid.query.placement) });
export const createBanner = async (req: Request, res: Response) => res.status(201).json({ data: await merch.createBanner(req.valid.body) });
export const updateBanner = async (req: Request, res: Response) => res.json({ data: await merch.updateBanner(id(req), req.valid.body) });
export async function deleteBanner(req: Request, res: Response) {
  await merch.deleteBanner(id(req));
  res.status(204).end();
}
export async function reorderBanners(req: Request, res: Response) {
  await merch.reorderBanners(req.valid.body.ids);
  res.status(204).end();
}

/* Orders */
export const listOrders = async (req: Request, res: Response) => res.json(await ops.listOrders(req.valid.query));
export const getOrder = async (req: Request, res: Response) => res.json({ data: await ops.getOrder(id(req)) });
export const updateOrderStatus = async (req: Request, res: Response) =>
  res.json({ data: await ops.updateOrderStatus(id(req), req.valid.body, actor(req)) });
export const updateOrderMeta = async (req: Request, res: Response) =>
  res.json({ data: await ops.updateOrderMeta(id(req), req.valid.body, actor(req)) });
export async function refundOrder(req: Request, res: Response) {
  res.json({ data: await ops.updateOrderStatus(id(req), { status: 'REFUNDED', restock: req.valid.body.restock, note: req.valid.body.note }, actor(req)) });
}

/* Customers */
export const listCustomers = async (req: Request, res: Response) => res.json(await ops.listCustomers(req.valid.query));
export const getCustomer = async (req: Request, res: Response) => res.json({ data: await ops.getCustomer(id(req)) });
export const updateCustomer = async (req: Request, res: Response) => res.json({ data: await ops.updateCustomer(id(req), req.valid.body, actor(req)) });

/* Reviews */
export const listReviews = async (req: Request, res: Response) => res.json(await ops.listReviews(req.valid.query));
export const setReviewStatus = async (req: Request, res: Response) => res.json({ data: await ops.setReviewStatus(id(req), req.valid.body.status) });
export async function deleteReview(req: Request, res: Response) {
  await ops.deleteReview(id(req));
  res.status(204).end();
}

/* Newsletter & messages */
export async function listSubscribers(req: Request, res: Response) {
  if (req.valid.query.format === 'csv') return sendCsv(res, 'newsletter-subscribers.csv', await ops.allSubscribersForExport());
  res.json(await ops.listSubscribers(req.valid.query));
}
export const listMessages = async (req: Request, res: Response) => res.json(await ops.listMessages(req.valid.query.page, req.valid.query.limit));
export const markMessage = async (req: Request, res: Response) => res.json({ data: await ops.markMessageRead(id(req), req.valid.body.isRead) });
