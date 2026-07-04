import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Order, DELIVERY_FEES, DeliveryZone } from '../models/Order';
import { SaleFile, computeRecord } from '../models/SaleFile';
import { nextSequence } from '../models/system';
import { loadActiveOffers, resolvePrice } from '../lib/offers';
import { supportsTransactions } from '../lib/db';
import { requireAdmin, validate, ApiError } from '../middleware';

const router = Router();

const createOrderSchema = z.object({
  // Client sends ONLY identifiers + quantity. No prices. (review #1)
  items: z
    .array(
      z.object({
        productId: z.string(),
        color: z.string().optional(),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1, 'السلة فارغة'),
  customerName: z.string().min(1, 'الاسم مطلوب'),
  phone: z.string().regex(/^\d{10}$/, 'رقم الهاتف يجب أن يكون 10 أرقام'),
  address: z.string().optional(),
  age: z.number().int().min(0).optional(),
  sex: z.enum(['male', 'female']).optional(),
  deliveryZone: z.enum(['westbank', 'jerusalem', 'inside48']),
});

async function resolveCustomer(data: any, session?: any) {
  // Upsert on unique phone — race-safe dedup (review #4).
  const customer = await Customer.findOneAndUpdate(
    { phone: data.phone },
    {
      $set: { name: data.customerName, address: data.address, age: data.age, sex: data.sex },
      $setOnInsert: { source: 'online' },
    },
    { new: true, upsert: true, session }
  );
  return customer!;
}

router.post('/orders', validate(createOrderSchema), async (req, res, next) => {
  const data = req.body as z.infer<typeof createOrderSchema>;
  try {
    // 1) Server-authoritative pricing: re-fetch every product, recompute prices.
    const ids = data.items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: ids } });
    const pMap = new Map(products.map((p) => [String(p._id), p]));
    const offerIdx = await loadActiveOffers();

    const orderItems: any[] = [];
    const saleRecords: any[] = [];
    let subtotal = 0;

    for (const line of data.items) {
      const p = pMap.get(line.productId);
      if (!p) throw new ApiError(400, 'منتج غير موجود');
      if (p.isSoldOut) throw new ApiError(400, `المنتج "${p.name}" غير متوفر حالياً`);

      const eff = resolvePrice(p, offerIdx); // ignore any client price
      const unitPrice = eff.price;
      const lineTotal = Math.round(unitPrice * line.quantity * 100) / 100;
      subtotal += lineTotal;

      const img = p.colors.find((c) => c.name === line.color)?.images[0] || p.colors[0]?.images[0];
      orderItems.push({
        product: p._id,
        nameSnap: p.name,
        codeSnap: p.code,
        imageSnap: img,
        color: line.color,
        unitPrice,
        quantity: line.quantity,
        lineTotal,
      });

      const { sellingPrice, profit } = computeRecord({
        originalPrice: unitPrice, // sale at the price actually charged
        cost: p.cost,
        priceType: 'original',
        quantity: line.quantity,
      });
      saleRecords.push({
        product: p._id,
        productNameSnap: p.name,
        productCodeSnap: p.code,
        productImageSnap: img,
        originalPrice: unitPrice,
        cost: p.cost,
        priceType: 'original',
        quantity: line.quantity,
        hasAccessories: false,
        sellingPrice,
        profit,
      });
    }

    const deliveryFee = DELIVERY_FEES[data.deliveryZone as DeliveryZone]; // server constant, not client
    subtotal = Math.round(subtotal * 100) / 100;
    const total = Math.round((subtotal + deliveryFee) * 100) / 100;

    // 2) Persist atomically (transaction) or with manual cleanup (review #5).
    const order = supportsTransactions()
      ? await createWithTransaction(data, orderItems, saleRecords, subtotal, deliveryFee, total)
      : await createWithCleanup(data, orderItems, saleRecords, subtotal, deliveryFee, total);

    res.status(201).json({ orderNumber: order.orderNumber });
  } catch (err) {
    next(err);
  }
});

async function buildOrderNumber(session?: any) {
  const year = new Date().getFullYear();
  const seq = await nextSequence(`order-${year}`, session);
  return `NO-${year}-${String(seq).padStart(4, '0')}`;
}

async function createWithTransaction(data: any, items: any[], records: any[], subtotal: number, deliveryFee: number, total: number) {
  const session = await mongoose.startSession();
  try {
    let order: any;
    await session.withTransaction(async () => {
      const orderNumber = await buildOrderNumber(session);

      // Online orders: create a standalone sale file with NO customer link
      // Don't look up or create a customer — avoid merging with existing sale files
      const [saleFile] = await SaleFile.create(
          [{ records, origin: 'online', walkIn: true }], // walkIn=true = no customer ref
          { session }
      );

      const [created] = await Order.create(
          [{
            customerName: data.customerName,
            phone: data.phone,
            address: data.address,
            age: data.age,
            sex: data.sex,
            items,
            deliveryZone: data.deliveryZone,
            deliveryFee,
            subtotal,
            total,
            saleFile: saleFile._id,
            orderNumber,
          }],
          { session }
      );

      saleFile.order = created._id as any;
      await saleFile.save({ session });
      order = created;
    });
    return order;
  } finally {
    session.endSession();
  }
}

async function createWithCleanup(data: any, items: any[], records: any[], subtotal: number, deliveryFee: number, total: number) {
  let saleFile: any;
  try {
    // Same — no customer lookup, standalone sale file
    saleFile = await SaleFile.create({ records, origin: 'online', walkIn: true });
    const orderNumber = await buildOrderNumber();
    const order = await Order.create({
      customerName: data.customerName,
      phone: data.phone,
      address: data.address,
      age: data.age,
      sex: data.sex,
      items,
      deliveryZone: data.deliveryZone,
      deliveryFee,
      subtotal,
      total,
      saleFile: saleFile._id,
      orderNumber,
    });
    saleFile.order = order._id;
    await saleFile.save();
    return order;
  } catch (err) {
    if (saleFile?._id) await SaleFile.deleteOne({ _id: saleFile._id }).catch(() => {});
    throw err;
  }
}

// ---- Admin ----
router.get('/admin/orders', requireAdmin, async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query as any;
    const q: any = {};
    if (status) q.status = status;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, parseInt(limit));
    const [data, totalCount] = await Promise.all([
      Order.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
      Order.countDocuments(q),
    ]);
    res.json({ data, page: p, limit: l, total: totalCount });
  } catch (e) {
    next(e);
  }
});

router.get('/admin/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) throw new ApiError(404, 'الطلب غير موجود');
    res.json(order);
  } catch (e) {
    next(e);
  }
});

const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled']),
});

router.patch('/admin/orders/:id/status', requireAdmin, validate(statusSchema), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'الطلب غير موجود');
    const newStatus = req.body.status;

    // Cancelled is the only status that touches the ledger (review #3).
    if (newStatus === 'cancelled' && order.status !== 'cancelled') {
      await SaleFile.updateOne({ _id: order.saleFile }, { $set: { isVoided: true } });
    }
    if (order.status === 'cancelled' && newStatus !== 'cancelled') {
      await SaleFile.updateOne({ _id: order.saleFile }, { $set: { isVoided: false } });
    }

    order.status = newStatus;
    await order.save();
    res.json(order);
  } catch (e) {
    next(e);
  }
});

router.delete('/admin/orders/:id', requireAdmin, async (req, res, next) => {
  try {
    const doc = await Order.findByIdAndDelete(req.params.id);
    if (!doc) throw new ApiError(404, 'الطلب غير موجود');
    // also delete the linked sale file if it exists
    if (doc.saleFile) await SaleFile.findByIdAndDelete(doc.saleFile);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
