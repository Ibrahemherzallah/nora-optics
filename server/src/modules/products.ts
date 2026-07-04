import { Router } from 'express';
import { z } from 'zod';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { loadActiveOffers } from '../lib/offers';
import { serializeProductPublic } from '../lib/serialize';
import { upload, uploadBuffer } from '../lib/cloudinary';
import { requireAdmin, validate, ApiError } from '../middleware';

const router = Router();

// ---------- PUBLIC ----------
router.get('/products', async (req, res, next) => {
  try {
    const { category, search, inOffer, inStock, page = '1', limit = '12' } = req.query as any;
    const q: any = { isDisappear: false }; // customers only see visible products
    if (category) q.categories = category;
    if (inStock === 'true') q.isSoldOut = false;
    if (search) q.$or = [{ name: new RegExp(escapeRegex(search), 'i') }, { code: new RegExp(escapeRegex(search), 'i') }];
    if (req.query.featured === 'true') q.isFeatured = true;  // ← add this

    const p = Math.max(1, parseInt(page));
    const l = Math.min(48, parseInt(limit));
    const offerIdx = await loadActiveOffers();

    let [docs, total] = await Promise.all([
      Product.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
      Product.countDocuments(q),
    ]);
    let data = docs.map((d) => serializeProductPublic(d, offerIdx));
    // inOffer filter applies AFTER serialization since offer state is computed.
    if (inOffer === 'true') data = data.filter((d) => d.onOffer);

    res.json({ data, page: p, limit: l, total });
  } catch (e) {
    next(e);
  }
});

router.get('/products/:id', async (req, res, next) => {
  try {
    const doc = await Product.findById(req.params.id).lean();
    // hidden products are treated as not found for the public (blocks direct links / guessed IDs)
    if (!doc || doc.isDisappear === true) throw new ApiError(404, 'المنتج غير موجود');
    const offerIdx = await loadActiveOffers();
    res.json(serializeProductPublic(doc, offerIdx));
  } catch (e) {
    next(e);
  }
});

router.get('/offers/products', async (_req, res, next) => {
  try {
    const offerIdx = await loadActiveOffers();
    const docs = await Product.find({ isSoldOut: false, isDisappear: false }).lean();
    const data = docs.map((d) => serializeProductPublic(d, offerIdx)).filter((d) => d.onOffer);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

router.get('/categories', async (_req, res, next) => {
  try {
    res.json({ data: await Category.find().sort({ name: 1 }).lean() });
  } catch (e) {
    next(e);
  }
});

// ---------- ADMIN ----------
const colorSchema = z.object({
  name: z.string().optional().default(''),  // was: z.string().min(1)
  images: z.array(z.string()).min(1, 'كل إدخال يحتاج صورة واحدة على الأقل'),
});
const productSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  categories: z.array(z.string()).min(1, 'اختر صنفاً واحداً على الأقل'),
  price: z.number().min(0),
  cost: z.number().min(0),
  size: z.string().optional(),
  colors: z.array(colorSchema).optional().default([]),
  isSoldOut: z.boolean().optional(),
  isDisappear: z.boolean().optional(), // customer-facing visibility toggle
  isInOffer: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

router.post('/admin/uploads', requireAdmin, upload.array('images', 10), async (req, res, next) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) throw new ApiError(400, 'لم يتم اختيار أي صورة');
    const urls = await Promise.all(files.map((f) => uploadBuffer(f.buffer)));
    res.json({ urls });
  } catch (e) {
    next(e);
  }
});

router.get('/admin/products', requireAdmin, async (req, res, next) => {

  try {
    const { search, page = '1', limit = '20' } = req.query as any;
    const q: any = {}; // admin sees ALL products, including hidden ones (needed for selling)
    if (search) q.$or = [{ name: new RegExp(escapeRegex(search), 'i') }, { code: new RegExp(escapeRegex(search), 'i') }];
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, parseInt(limit));
    const [data, total] = await Promise.all([
      Product.find(q).populate('categories', 'name').sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
      Product.countDocuments(q),
    ]);
    res.json({ data, page: p, limit: l, total }); // admin sees full doc incl. cost
  } catch (e) {
    next(e);
  }
});

router.post('/admin/products', requireAdmin, validate(productSchema), async (req, res, next) => {
  try {
    res.status(201).json(await Product.create(req.body));
  } catch (e) {
    next(e);
  }
});

router.put('/admin/products/:id', requireAdmin, validate(productSchema.partial()), async (req, res, next) => {
  try {
    const doc = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) throw new ApiError(404, 'المنتج غير موجود');
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/admin/products/:id', requireAdmin, async (req, res, next) => {
  try {
    const doc = await Product.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    if (!doc) throw new ApiError(404, 'المنتج غير موجود');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default router;