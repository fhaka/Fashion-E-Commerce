import { Router } from 'express';
import { z } from 'zod';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '@maison/shared';
import * as c from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), c.register);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), c.login);
authRouter.post('/demo-login', authLimiter, validate({ body: z.object({ role: z.enum(['customer', 'admin']) }) }), c.demoLogin);
authRouter.post('/refresh', c.refresh);
authRouter.post('/logout', c.logout);
authRouter.get('/me', authenticate, c.me);
authRouter.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), c.forgotPassword);
authRouter.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), c.resetPassword);
// Lives under /auth so it receives the refresh cookie and can keep the current session alive.
authRouter.post('/change-password', authenticate, authLimiter, validate({ body: changePasswordSchema }), c.changePassword);
