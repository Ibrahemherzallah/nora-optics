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
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Revenue/profit come from the sale-file ledger (covers in-store + online),
    // excluding voided files so cancelled orders never inflate the totals.
    const sumSales = async (from: Date) => {
      const r = await SaleFile.aggregate([
        { $match: { createdAt: { $gte: from }, isVoided: { $ne: true } } },
        { $group: { _id: null, sales: { $sum: '$totalSelling' }, profit: { $sum: '$totalProfit' }, count: { $sum: 1 } } },
      ]);
      return r[0] ? { sales: r[0].sales, profit: r[0].profit, count: r[0].count } : { sales: 0, profit: 0, count: 0 };
    };

    const [today, month, statusAgg, products, customers, recentOrders] = await Promise.all([
      sumSales(startToday),
      sumSales(startMonth),
      Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Product.countDocuments({ isDeleted: false }), // countDocuments bypasses the soft-delete hook
      Customer.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(6).select('orderNumber customerName total status createdAt').lean(),
    ]);

    const orders: Record<string, number> = { pending: 0, confirmed: 0, out_for_delivery: 0, delivered: 0, cancelled: 0, total: 0 };
    statusAgg.forEach((s: any) => {
      orders[s._id] = s.n;
      orders.total += s.n;
    });

    const activeOffers = await Offer.countDocuments({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } });

    res.json({ today, month, orders, counts: { products, customers, activeOffers }, recentOrders });
  } catch (e) {
    next(e);
  }
});

export default router;
