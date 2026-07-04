import { Router } from 'express';
import { z } from 'zod';
import { EyeExam } from '../models/EyeExam';
import { SaleFile } from '../models/SaleFile';
import { Offer } from '../models/Offer';
import { Customer } from '../models/Customer';
import { requireAdmin, validate, ApiError } from '../middleware';

const router = Router();

// ---------- Shared schemas ----------
const sideSchema = z.object({
    sph: z.string().optional(),
    cyl: z.string().optional(),
    axis: z.string().optional(),
    add: z.string().optional(),
    va: z.string().optional(),
});

const examRecordInput = z
    .object({
        right: sideSchema.default({}),
        left: sideSchema.default({}),
        ipd: z.string().optional(),
        source: z.enum(['external', 'internal', 'old']),
        doctorName: z.string().optional(),
        date: z.coerce.date().optional(),   // ← NEW: coerce string → Date, optional (defaults to now)
    })

const createExamSchema = z.object({
    customerId: z.string().optional(),
    newCustomer: z
        .object({
            name: z.string().min(1),
            phone: z.string().regex(/^\d{10}$/, 'رقم الهاتف يجب أن يكون 10 أرقام').optional(),
            age: z.number().int().min(0).optional(),
            address: z.string().optional(),
        })
        .optional(),
    saleFile: z.string().optional(),
    record: examRecordInput,
});

// ---------- Eye Exam routes ----------
router.post('/admin/eye-exams', requireAdmin, validate(createExamSchema), async (req, res, next) => {
    try {
        const body = req.body as z.infer<typeof createExamSchema>;
        let customerId = body.customerId;
        if (!customerId) {
            if (!body.newCustomer) throw new ApiError(400, 'مطلوب عميل');
            const or: any[] = [{ name: body.newCustomer.name.trim() }];
            if (body.newCustomer.phone) or.push({ phone: body.newCustomer.phone });
            const dupe = await Customer.findOne({ $or: or });
            if (dupe) throw new ApiError(409, 'يوجد عميل بنفس الاسم أو رقم الهاتف. اختر "ربط عميل موجود".');
            const created = await Customer.create({ ...body.newCustomer, source: 'store' });
            customerId = String(created._id);
        }

        let exam = await EyeExam.findOne({ customer: customerId });
        if (exam) {
            exam.records.push(body.record as any);
            await exam.save();
            return res.status(200).json(exam);
        }

        exam = await EyeExam.create({ customer: customerId, saleFile: body.saleFile, records: [body.record] });
        if (body.saleFile) await SaleFile.updateOne({ _id: body.saleFile }, { $set: { eyeExam: exam._id } });
        res.status(201).json(exam);
    } catch (e) {
        next(e);
    }
});

router.get('/admin/eye-exams', requireAdmin, async (_req, res, next) => {
    try {
        res.json({
            data: await EyeExam.find()
                .populate('customer', 'name phone')
                .sort({ updatedAt: -1 })
                .limit(100)
                .lean(),
        });
    } catch (e) {
        next(e);
    }
});

router.get('/admin/eye-exams/:id', requireAdmin, async (req, res, next) => {
    try {
        const doc = await EyeExam.findById(req.params.id).populate('customer').lean();
        if (!doc) throw new ApiError(404, 'الفحص غير موجود');
        res.json(doc);
    } catch (e) {
        next(e);
    }
});

router.post('/admin/eye-exams/:id/records', requireAdmin, validate(examRecordInput), async (req, res, next) => {
    try {
        const exam = await EyeExam.findById(req.params.id);
        if (!exam) throw new ApiError(404, 'الفحص غير موجود');
        exam.records.push(req.body);
        await exam.save();
        res.json(exam);
    } catch (e) {
        next(e);
    }
});

router.delete('/admin/eye-exams/:id', requireAdmin, async (req, res, next) => {
    try {
        const doc = await EyeExam.findByIdAndDelete(req.params.id);
        if (!doc) throw new ApiError(404, 'الفحص غير موجود');
        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
});

// ---------- Offers ----------
const offerSchema = z.object({
    title: z.string().min(1),
    type: z.enum(['all', 'categories', 'products', 'product']), // added 'all', renamed 'category' → 'categories'
    categories: z.array(z.string()).optional(),  // was: category (single)
    products: z.array(z.string()).optional(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.number().min(0),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isActive: z.boolean().default(true),
}).superRefine((v, ctx) => {
    if (v.type === 'categories' && (!v.categories || v.categories.length === 0))
        ctx.addIssue({ code: 'custom', message: 'اختر صنفاً واحداً على الأقل', path: ['categories'] });
    if ((v.type === 'products' || v.type === 'product') && (!v.products || v.products.length === 0))
        ctx.addIssue({ code: 'custom', message: 'اختر منتجاً واحداً على الأقل', path: ['products'] });
    if (v.discountType === 'percentage' && v.discountValue > 100)
        ctx.addIssue({ code: 'custom', message: 'النسبة لا تتجاوز 100', path: ['discountValue'] });
    if (v.endDate <= v.startDate)
        ctx.addIssue({ code: 'custom', message: 'تاريخ الانتهاء بعد البداية', path: ['endDate'] });
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