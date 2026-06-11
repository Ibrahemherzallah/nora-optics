import { Router } from 'express';
import { z } from 'zod';
import { SaleFile, computeRecord } from '../models/SaleFile';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { requireAdmin, validate, ApiError } from '../middleware';

const router = Router();

const recordInput = z
  .object({
    productId: z.string().min(1),
    priceType: z.enum(['original', 'custom']),
    customPrice: z.number().min(0).optional(),
    quantity: z.number().int().min(1).default(1),
    hasAccessories: z.boolean().default(false),
    accessoriesDesc: z.string().optional(),
    accessoriesCost: z.number().min(0).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.priceType === 'custom' && (v.customPrice === undefined || v.customPrice === null))
      ctx.addIssue({ code: 'custom', message: 'السعر المخصص مطلوب', path: ['customPrice'] });
    if (v.hasAccessories) {
      if (!v.accessoriesDesc) ctx.addIssue({ code: 'custom', message: 'وصف الملحقات مطلوب', path: ['accessoriesDesc'] });
      if (v.accessoriesCost === undefined) ctx.addIssue({ code: 'custom', message: 'تكلفة الملحقات مطلوبة', path: ['accessoriesCost'] });
    }
  });

// Build a persisted SaleRecord from a product snapshot + pricing input.
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
  };
}

const createSchema = z.object({
  customerId: z.string().optional(),
  newCustomer: z
    .object({
      name: z.string().min(1),
      phone: z.string().regex(/^\d{10}$/),
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
    let customerId = body.customerId;
    if (!customerId) {
      if (!body.newCustomer) throw new ApiError(400, 'مطلوب عميل');
      const existing = await Customer.findOne({ phone: body.newCustomer.phone });
      customerId = existing ? String(existing._id) : String((await Customer.create({ ...body.newCustomer, source: 'store' }))._id);
    }
    const records = await Promise.all(body.records.map(buildRecord));
    const saleFile = await SaleFile.create({ customer: customerId, records, origin: 'admin' });
    res.status(201).json(saleFile);
  } catch (e) {
    next(e);
  }
});

router.get('/admin/sale-files', requireAdmin, async (req, res, next) => {
  try {
    const { page = '1', limit = '20' } = req.query as any;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, parseInt(limit));
    const [data, total] = await Promise.all([
      SaleFile.find().populate('customer', 'name phone').sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
      SaleFile.countDocuments(),
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

// Append a record to an existing file (repeat customer — PRD rule 2).
router.post('/admin/sale-files/:id/records', requireAdmin, validate(recordInput), async (req, res, next) => {
  try {
    const saleFile = await SaleFile.findById(req.params.id);
    if (!saleFile) throw new ApiError(404, 'الملف غير موجود');
    saleFile.records.push((await buildRecord(req.body)) as any);
    await saleFile.save(); // pre-save recomputes totals
    res.json(saleFile);
  } catch (e) {
    next(e);
  }
});

export default router;
