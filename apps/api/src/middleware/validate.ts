import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { ApiError } from '../utils/ApiError';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validates and coerces request parts with zod. Parsed values are exposed on
 * `req.valid` (Express 5 makes `req.query` read-only, so we never mutate it).
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.valid ??= {};
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        const fields: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = issue.path.join('.') || part;
          fields[key] ??= issue.message;
        }
        return next(ApiError.validation({ fields }));
      }
      req.valid[part] = result.data;
    }
    next();
  };
}
