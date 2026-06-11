import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ZodSchema } from 'zod';

export interface AuthedRequest extends Request {
  admin?: { id: string; username: string };
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: { message: 'مطلوب تسجيل الدخول' } });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as any;
    req.admin = { id: payload.id, username: payload.username };
    next();
  } catch {
    res.status(401).json({ error: { message: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً' } });
  }
}

// Validates req.body against a zod schema; replaces body with parsed (typed) data.
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const first = result.error.issues[0];
      return res.status(400).json({ error: { message: first?.message || 'بيانات غير صحيحة', issues: result.error.issues } });
    }
    req.body = result.data;
    next();
  };
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Central error handler — always returns { error: { message } } (PRD §8).
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) return res.status(err.status).json({ error: { message: err.message } });
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ error: { message: `قيمة مكررة (${field})` } });
  }
  if (err?.name === 'MulterError') return res.status(400).json({ error: { message: 'فشل رفع الملف: ' + err.message } });
  console.error(err);
  res.status(500).json({ error: { message: err?.message || 'خطأ في الخادم' } });
}
