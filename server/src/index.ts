import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './lib/db';
import { errorHandler } from './middleware';

import authRoutes from './modules/auth';
import productRoutes from './modules/products';
import miscRoutes from './modules/misc';
import orderRoutes from './modules/orders';
import saleFileRoutes from './modules/saleFiles';
import examsOffersRoutes from './modules/examsOffers';
import dashboardRoutes from './modules/dashboard';

async function main() {
  await connectDB(process.env.MONGODB_URI!);

  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/admin/auth', authRoutes);
  // products module exposes both public (/api/products...) and admin (/api/admin/products...)
  app.use('/api', productRoutes);
  app.use('/api', miscRoutes);
  app.use('/api', orderRoutes);
  app.use('/api', saleFileRoutes);
  app.use('/api', examsOffersRoutes);
  app.use('/api', dashboardRoutes);

  app.use((_req, res) => res.status(404).json({ error: { message: 'المسار غير موجود' } }));
  app.use(errorHandler);

  const port = parseInt(process.env.PORT || '4000');
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
