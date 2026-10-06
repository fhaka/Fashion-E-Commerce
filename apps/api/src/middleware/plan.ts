import type { NextFunction, Request, Response } from 'express';
import { planIncludes, type Feature } from '@maison/shared';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export const hasFeature = (feature: Feature) => planIncludes(env.PLAN, feature);

/** Blocks routes for features outside the deployment's plan (they simply don't exist for the client). */
export function requireFeature(feature: Feature) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    if (!hasFeature(feature)) return next(new ApiError(404, 'FEATURE_UNAVAILABLE', 'This feature is not part of the store plan'));
    next();
  };
}
