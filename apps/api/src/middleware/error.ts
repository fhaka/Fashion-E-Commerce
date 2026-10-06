import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { MAX_UPLOAD_BYTES, MAX_VIDEO_BYTES } from './upload';

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`Route ${req.method} ${req.path} not found`));
}

// Express recognises error handlers by their 4-argument signature.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let error: ApiError;

  if (err instanceof ApiError) {
    error = err;
  } else if (err instanceof ZodError) {
    error = ApiError.validation({ fields: Object.fromEntries(err.issues.map((i) => [i.path.join('.'), i.message])) });
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ');
      error = ApiError.conflict(`A record with this ${target ?? 'value'} already exists`);
    } else if (err.code === 'P2025') {
      error = ApiError.notFound('Record not found');
    } else if (err.code === 'P2003') {
      error = ApiError.conflict('This record is referenced by other data and cannot be changed');
    } else {
      error = new ApiError(500, 'DATABASE_ERROR', 'A database error occurred');
    }
  } else if (err instanceof MulterError) {
    error = ApiError.badRequest(
      err.code === 'LIMIT_FILE_SIZE'
        ? `File is too large (maximum ${(req.path.endsWith('/video') ? MAX_VIDEO_BYTES : MAX_UPLOAD_BYTES) / 1024 / 1024} MB)`
        : err.message,
    );
  } else if (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type: string }).type === 'entity.parse.failed'
  ) {
    error = ApiError.badRequest('Malformed JSON body');
  } else if (typeof err === 'object' && err !== null && 'type' in err && (err as { type: string }).type === 'entity.too.large') {
    error = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
  } else {
    error = new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong on our side');
  }

  if (error.status >= 500) {
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  }

  res.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      ...(!env.isProd && error.status >= 500 && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
}
