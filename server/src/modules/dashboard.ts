import { Router } from 'express';
import { SaleFile } from '../models/SaleFile';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Offer } from '../models/Offer';
import { requireAdmin } from '../middleware';

const router = Router();

router.get('/admin/dashboard', requireAdmin, async (_req, res, next) => {
  try {
    const now = new Date();

    // Build boundaries in local time by using explicit year/month/day
    // new Date(year, month, day) uses LOCAL time, so no timezone offset issue.
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const sumSales = async (from: Date) => {
      const r = await SaleFile.aggregate([
        // only non-voided files
        { $match: { isVoided: { $ne: true } } },
        // explode records array — one doc per record
        { $unwind: '$records' },
        // filter by when each record was created
        { $match: { 'records.createdAt': { $gte: from } } },
        // sum up
        {
          $group: {
            _id: null,
            sales: { $sum: { $multiply: ['$records.sellingPrice', '$records.quantity'] } },
            profit: { $sum: '$records.profit' },
            count: { $sum: 1 },
          },
        },
      ]);
      return r[0]
          ? { sales: r[0].sales, profit: r[0].profit, count: r[0].count }
          : { sales: 0, profit: 0, count: 0 };
    };

    const [today, month, statusAgg, products, customers, recentOrders] = await Promise.all([
      sumSales(startToday),
      sumSales(startMonth),
      Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Product.countDocuments({ isDeleted: false }),
      Customer.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(6).select('orderNumber customerName total status createdAt').lean(),
    ]);

    const orders: Record<string, number> = { pending: 0, confirmed: 0, out_for_delivery: 0, delivered: 0, cancelled: 0, total: 0 };
    statusAgg.forEach((s: any) => {
      orders[s._id] = s.n;
      orders.total += s.n;
    });

    const activeOffers = await Offer.countDocuments({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    res.json({ today, month, orders, counts: { products, customers, activeOffers }, recentOrders });
  } catch (e) {
    next(e);
  }
});

export default router;
