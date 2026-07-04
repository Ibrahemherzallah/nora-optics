import {Router} from "express";
import { Customer } from '../models/Customer';
import { SaleFile } from '../models/SaleFile';
import { EyeExam } from '../models/EyeExam';
import { z } from 'zod';
import { requireAdmin, validate, ApiError } from '../middleware';

const router = Router();

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const customerUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().regex(/^\d{10}$/, 'رقم الهاتف يجب أن يكون 10 أرقام').optional().or(z.literal('')),
    address: z.string().optional(),
    age: z.number().int().min(0).optional(),
    sex: z.enum(['male', 'female']).optional().or(z.literal('')),
});

router.get('/admin/customers-list', requireAdmin, async (req, res, next) => {
    try {
        const { search, page = '1', limit = '30' } = req.query as any;
        const p = Math.max(1, parseInt(page));
        const l = Math.min(100, parseInt(limit));
        const q: any = {};
        if (search) {
            const rx = new RegExp(escapeRegex(String(search).trim()), 'i');
            q.$or = [{ name: rx }, { phone: rx }];
        }
        const [customers, total] = await Promise.all([
            Customer.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
            Customer.countDocuments(q),
        ]);

        // attach sale file + eye exam refs in one round-trip each
        const ids = customers.map((c) => c._id);
        const [saleFiles, eyeExams] = await Promise.all([
            SaleFile.find({ customer: { $in: ids } }).select('customer totalSelling totalProfit isVoided records').lean(),
            EyeExam.find({ customer: { $in: ids } }).select('customer records').lean(),
        ]);

        const sfMap = new Map(saleFiles.map((f) => [String(f.customer), f]));
        const eeMap = new Map(eyeExams.map((e) => [String(e.customer), e]));

        const data = customers.map((c) => ({
            ...c,
            saleFile: sfMap.get(String(c._id)) ?? null,
            eyeExam: eeMap.get(String(c._id)) ?? null,
        }));

        res.json({ data, page: p, limit: l, total });
    } catch (e) {
        next(e);
    }
});


router.put('/admin/customers/:id', requireAdmin, async (req, res, next) => {
    try {
        const body = customerUpdateSchema.parse(req.body);

        // if phone is being changed, check it's not taken by another customer
        if (body.phone) {
            const existing = await Customer.findOne({ phone: body.phone, _id: { $ne: req.params.id } });
            if (existing) throw new ApiError(409, 'رقم الهاتف مستخدم من قِبل عميل آخر');
        }

        // treat empty string phone as "remove phone"
        const update: any = { ...body };
        if (body.phone === '') update.phone = undefined;
        if (body.sex === '') update.sex = undefined;

        const doc = await Customer.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!doc) throw new ApiError(404, 'العميل غير موجود');
        res.json(doc);
    } catch (e) {
        next(e);
    }
});


export default router;