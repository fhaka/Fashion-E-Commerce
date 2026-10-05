import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` / `optionalAuth` when a valid access token is present. */
      user?: { id: string; role: Role };
      /** Parsed + validated request parts, set by the `validate` middleware. */
      valid: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

export {};
