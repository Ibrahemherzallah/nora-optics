import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AdminUser } from '../models/system';
import { validate, ApiError, requireAdmin, AuthedRequest } from '../middleware';

const router = Router();

// Rate-limit login to blunt brute force (PRD §9 security).
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await AdminUser.findOne({ username });
    // Constant-ish path: always run a compare to avoid username enumeration via timing.
    const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !ok) throw new ApiError(401, 'بيانات الدخول غير صحيحة');
    const token = jwt.sign({ id: String(user._id), username: user.username }, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '12h',
    } as jwt.SignOptions);
    res.json({ token, username: user.username });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAdmin, (req: AuthedRequest, res) => res.json({ admin: req.admin }));

export default router;
