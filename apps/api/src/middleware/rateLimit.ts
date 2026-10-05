import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

function limiter(windowMs: number, limit: number, overrides: Partial<Options> = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (_req, _res, next) => next(ApiError.tooMany()),
    ...overrides,
  });
}

/** Global API limit. */
export const apiLimiter = limiter(15 * 60 * 1000, 1000);
/** Login / register / password reset — brute-force protection. */
export const authLimiter = limiter(15 * 60 * 1000, 20, { skipSuccessfulRequests: true });
/** Coupon validation — prevents code enumeration. */
export const couponLimiter = limiter(10 * 60 * 1000, 30);
/** Order placement — generous for real shoppers, blocks scripted order spam. */
export const checkoutLimiter = limiter(10 * 60 * 1000, 30);
/** Admin uploads. */
export const uploadLimiter = limiter(10 * 60 * 1000, 120);
/** Newsletter / contact forms — spam protection. */
export const formLimiter = limiter(60 * 60 * 1000, 10);
