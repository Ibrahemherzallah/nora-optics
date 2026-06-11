import { Router } from 'express';
import { z } from 'zod';
import { Category } from '../models/Category';
import { Customer } from '../models/Customer';
import { Settings } from '../models/system';
import { requireAdmin, validate, ApiError } from '../middleware';

const router = Router();

// ---------- Categories (admin) ----------
const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  image: z.string().min(1, 'الصورة مطلوبة'),
});

router.get('/admin/categories', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ data: await Category.find().sort({ createdAt: -1 }).lean() });
  } catch (e) {
    next(e);
  }
});
router.post('/admin/categories', requireAdmin, validate(categorySchema), async (req, res, next) => {
  try {
    res.status(201).json(await Category.create(req.body));
  } catch (e) {
    next(e);
  }
});
router.put('/admin/categories/:id', requireAdmin, validate(categorySchema.partial()), async (req, res, next) => {
  try {
    const doc = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) throw new ApiError(404, 'الصنف غير موجود');
    res.json(doc);
  } catch (e) {
    next(e);
  }
});
router.delete('/admin/categories/:id', requireAdmin, async (req, res, next) => {
  try {
    await Category.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------- Customers (admin) ----------
const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().regex(/^\d{10}$/, 'رقم الهاتف يجب أن يكون 10 أرقام'),
  address: z.string().optional(),
  age: z.number().int().min(0).optional(),
  sex: z.enum(['male', 'female']).optional(),
});

router.get('/admin/customers', requireAdmin, async (req, res, next) => {
  try {
    const { search } = req.query as any;
    const q: any = {};
    if (search) q.$or = [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search) }];
    res.json({ data: await Customer.find(q).sort({ createdAt: -1 }).limit(50).lean() });
  } catch (e) {
    next(e);
  }
});
router.post('/admin/customers', requireAdmin, validate(customerSchema), async (req, res, next) => {
  try {
    // reuse existing customer if phone already on file
    const existing = await Customer.findOne({ phone: req.body.phone });
    if (existing) return res.json(existing);
    res.status(201).json(await Customer.create({ ...req.body, source: 'store' }));
  } catch (e) {
    next(e);
  }
});

// ---------- Settings / contact ----------
router.get('/settings/contact', async (_req, res, next) => {
  try {
    const doc = (await Settings.findOne({ key: 'contact' }).lean()) || { key: 'contact', storeName: 'مركز نورا للبصريات', phones: [] };
    res.json(doc);
  } catch (e) {
    next(e);
  }
});
router.put('/admin/settings/contact', requireAdmin, async (req, res, next) => {
  try {
    const doc = await Settings.findOneAndUpdate({ key: 'contact' }, { $set: req.body }, { new: true, upsert: true });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

export default router;
