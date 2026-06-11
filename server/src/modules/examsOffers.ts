import { Router } from 'express';
import { z } from 'zod';
import { EyeExam } from '../models/EyeExam';
import { SaleFile } from '../models/SaleFile';
import { Offer } from '../models/Offer';
import { requireAdmin, validate, ApiError } from '../middleware';

const router = Router();

// ---------- Eye Exams ----------
const sideSchema = z.object({ sph: z.string().optional(), cyl: z.string().optional(), axis: z.string().optional(), add: z.string().optional(), va: z.string().optional() });

// Two orthogonal conditionals → superRefine, not a discriminated union (review #8).
const eyeExamSchema = z
  .object({
    customer: z.string().optional(),
    saleFile: z.string().optional(),
    name: z.string().optional(),
    age: z.number().int().min(0).optional(),
    address: z.string().optional(),
    phone: z.string().regex(/^\d{10}$/).optional(),
    right: sideSchema.default({}),
    left: sideSchema.default({}),
    ipd: z.string().optional(),
    source: z.enum(['external', 'internal', 'old']),
    doctorName: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.source === 'external' || v.source === 'internal') && !v.doctorName)
      ctx.addIssue({ code: 'custom', message: 'اسم الطبيب مطلوب للفحص الخارجي/الداخلي', path: ['doctorName'] });
    // If not linked to an existing customer, inline name + phone are required.
    if (!v.customer && (!v.name || !v.phone))
      ctx.addIssue({ code: 'custom', message: 'الاسم ورقم الهاتف مطلوبان عند عدم ربط عميل', path: ['name'] });
  });

router.post('/admin/eye-exams', requireAdmin, validate(eyeExamSchema), async (req, res, next) => {
  try {
    const exam = await EyeExam.create(req.body);
    // If linked to a sale file, attach back-reference.
    if (req.body.saleFile) await SaleFile.updateOne({ _id: req.body.saleFile }, { $set: { eyeExam: exam._id } });
    res.status(201).json(exam);
  } catch (e) {
    next(e);
  }
});

router.get('/admin/eye-exams', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ data: await EyeExam.find().populate('customer', 'name phone').sort({ createdAt: -1 }).limit(100).lean() });
  } catch (e) {
    next(e);
  }
});

router.get('/admin/eye-exams/:id', requireAdmin, async (req, res, next) => {
  try {
    const doc = await EyeExam.findById(req.params.id).lean();
    if (!doc) throw new ApiError(404, 'الفحص غير موجود');
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/admin/eye-exams/:id', requireAdmin, validate(eyeExamSchema), async (req, res, next) => {
  try {
    const doc = await EyeExam.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) throw new ApiError(404, 'الفحص غير موجود');
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

// ---------- Offers ----------
const offerSchema = z
  .object({
    title: z.string().min(1),
    type: z.enum(['category', 'products', 'product']),
    category: z.string().optional(),
    products: z.array(z.string()).optional(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().min(0),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'category' && !v.category) ctx.addIssue({ code: 'custom', message: 'اختر صنفاً', path: ['category'] });
    if ((v.type === 'products' || v.type === 'product') && (!v.products || v.products.length === 0))
      ctx.addIssue({ code: 'custom', message: 'اختر منتجاً واحداً على الأقل', path: ['products'] });
    if (v.discountType === 'percentage' && v.discountValue > 100)
      ctx.addIssue({ code: 'custom', message: 'النسبة لا تتجاوز 100', path: ['discountValue'] });
    if (v.endDate <= v.startDate) ctx.addIssue({ code: 'custom', message: 'تاريخ الانتهاء بعد البداية', path: ['endDate'] });
  });

router.get('/admin/offers', requireAdmin, async (_req, res, next) => {
  try {
    res.json({ data: await Offer.find().sort({ createdAt: -1 }).lean() });
  } catch (e) {
    next(e);
  }
});
router.post('/admin/offers', requireAdmin, validate(offerSchema), async (req, res, next) => {
  try {
    res.status(201).json(await Offer.create(req.body));
  } catch (e) {
    next(e);
  }
});
router.put('/admin/offers/:id', requireAdmin, validate(offerSchema), async (req, res, next) => {
  try {
    const doc = await Offer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) throw new ApiError(404, 'العرض غير موجود');
    res.json(doc);
  } catch (e) {
    next(e);
  }
});
router.delete('/admin/offers/:id', requireAdmin, async (req, res, next) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
