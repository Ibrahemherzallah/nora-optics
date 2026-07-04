import { Router } from 'express';
import { z } from 'zod';
import { SaleFile, computeRecord } from '../models/SaleFile';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { requireAdmin, validate, ApiError } from '../middleware';

const router = Router();

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const recordInput = z
    .object({
      productId: z.string().min(1),
      priceType: z.enum(['original', 'custom']),
      customPrice: z.number().min(0).optional(),
      quantity: z.number().int().min(1).default(1),
      hasAccessories: z.boolean().default(false),
      accessoriesDesc: z.string().optional(),
      accessoriesCost: z.number().min(0).optional(),
      notes: z.string().optional(),        // NEW
      date: z.coerce.date().optional(), // optional → defaults to now in model

    })
    .superRefine((v, ctx) => {
      if (v.priceType === 'custom' && (v.customPrice === undefined || v.customPrice === null))
        ctx.addIssue({ code: 'custom', message: 'السعر المخصص مطلوب', path: ['customPrice'] });
      if (v.hasAccessories && v.accessoriesCost === undefined)
        ctx.addIssue({ code: 'custom', message: 'تكلفة الملحقات مطلوبة', path: ['accessoriesCost'] });
    });

async function buildRecord(input: z.infer<typeof recordInput>) {
  const product = await Product.findById(input.productId);
  if (!product) throw new ApiError(400, 'المنتج غير موجود');
  const { sellingPrice, profit, quantity } = computeRecord({
    originalPrice: product.price,
    cost: product.cost,
    priceType: input.priceType,
    customPrice: input.customPrice,
    quantity: input.quantity,
    accessoriesCost: input.accessoriesCost,
  });
  return {
    product: product._id,
    productNameSnap: product.name,
    productCodeSnap: product.code,
    productImageSnap: product.colors[0]?.images[0],
    originalPrice: product.price,
    cost: product.cost,
    priceType: input.priceType,
    customPrice: input.customPrice,
    quantity,
    hasAccessories: input.hasAccessories,
    accessoriesDesc: input.accessoriesDesc,
    accessoriesCost: input.accessoriesCost,
    sellingPrice,
    profit,
    notes: input.notes,
    date: input.date,
  };
}

const createSchema = z.object({
  customerId: z.string().optional(),
  walkIn: z.boolean().optional(),
  newCustomer: z
      .object({
        name: z.string().min(1),
        phone: z.string().regex(/^\d{10}$/, 'رقم الهاتف يجب أن يكون 10 أرقام').optional(), // #1 optional
        address: z.string().optional(),
        age: z.number().int().min(0).optional(),
        sex: z.enum(['male', 'female']).optional(),
      })
      .optional(),
  records: z.array(recordInput).min(1, 'أضف منتجاً واحداً على الأقل'),
});


router.post('/admin/sale-files', requireAdmin, validate(createSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createSchema>;
    const records = await Promise.all(body.records.map(buildRecord));

    // walk-in: no customer file
    if (body.walkIn) {
      const sf = await SaleFile.create({ records, origin: 'admin', walkIn: true });
      return res.status(201).json(sf);
    }

    let customerId = body.customerId;
    if (!customerId) {
      if (!body.newCustomer) throw new ApiError(400, 'مطلوب عميل');
      const or: any[] = [{ name: body.newCustomer.name.trim() }];
      if (body.newCustomer.phone) or.push({ phone: body.newCustomer.phone });
      const dupe = await Customer.findOne({ $or: or });
      if (dupe) throw new ApiError(409, 'يوجد عميل بنفس الاسم أو رقم الهاتف. اختر "عميل موجود".');
      const created = await Customer.create({ ...body.newCustomer, source: 'store' });
      customerId = String(created._id);
    }

    // NEW: one sale file per customer — if one exists, send the admin to it
    const existingFile = await SaleFile.findOne({ customer: customerId });
    if (existingFile) {
      throw new ApiError(409, JSON.stringify({
        message: 'يوجد ملف بيع لهذا العميل بالفعل. أضف العملية إلى نفس الملف.',
        saleFileId: String(existingFile._id),
      }));
    }

    const sf = await SaleFile.create({ customer: customerId, records, origin: 'admin' });
    res.status(201).json(sf);
  } catch (e) {
    next(e);
  }
});

// #6 — list with search by customer name / phone
router.get('/admin/sale-files', requireAdmin, async (req, res, next) => {
  try {
    const { page = '1', limit = '20', search } = req.query as any;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, parseInt(limit));

    const q: any = {};
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegex(String(search).trim()), 'i');
      const custs = await Customer.find({ $or: [{ name: rx }, { phone: rx }] }).select('_id').lean();
      q.customer = { $in: custs.map((c) => c._id) }; // walk-ins (no customer) are excluded from a name/phone search
    }

    const [data, total] = await Promise.all([
      SaleFile.find(q).populate('customer', 'name phone').sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
      SaleFile.countDocuments(q),
    ]);
    res.json({ data, page: p, limit: l, total });
  } catch (e) {
    next(e);
  }
});

router.get('/admin/sale-files/:id', requireAdmin, async (req, res, next) => {
  try {
    const doc = await SaleFile.findById(req.params.id).populate('customer').lean();
    if (!doc) throw new ApiError(404, 'الملف غير موجود');
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.post('/admin/sale-files/:id/records', requireAdmin, validate(recordInput), async (req, res, next) => {
  try {
    const saleFile = await SaleFile.findById(req.params.id);
    if (!saleFile) throw new ApiError(404, 'الملف غير موجود');
    saleFile.records.push((await buildRecord(req.body)) as any);
    await saleFile.save();
    res.json(saleFile);
  } catch (e) {
    next(e);
  }
});

router.delete('/admin/sale-files/:id', requireAdmin, async (req, res, next) => {
  try {
    const doc = await SaleFile.findByIdAndDelete(req.params.id);
    if (!doc) throw new ApiError(404, 'الملف غير موجود');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;