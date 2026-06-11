import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../lib/db';
import { AdminUser, Settings } from '../models/system';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Offer } from '../models/Offer';

async function run() {
  await connectDB(process.env.MONGODB_URI!);

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'changeme123';

  const existing = await AdminUser.findOne({ username });
  if (existing) {
    console.log(`Admin "${username}" already exists — skipping.`);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await AdminUser.create({ username, passwordHash, role: 'admin' });
    console.log(`Created admin "${username}".`);
  }

  await Settings.findOneAndUpdate(
    { key: 'contact' },
    {
      $setOnInsert: {
        key: 'contact',
        storeName: 'مركز نورا للبصريات',
        address: 'نابلس، فلسطين',
        phones: ['0599000000'],
        workingHours: 'السبت - الخميس: 9 صباحاً - 8 مساءً',
      },
    },
    { upsert: true }
  );

  // Sample catalog (only if empty) so the storefront isn't blank on first run.
  if ((await Category.countDocuments()) === 0) {
    const sun = await Category.create({
      name: 'نظارات شمسية',
      description: 'تشكيلة النظارات الشمسية',
      image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600',
    });
    const optical = await Category.create({
      name: 'نظارات طبية',
      description: 'إطارات طبية أنيقة',
      image: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=600',
    });

    const created = await Product.create([
      {
        name: 'نظارة شمسية كلاسيك',
        code: 'SUN-001',
        category: sun._id,
        price: 250,
        cost: 150,
        size: 'Medium',
        colors: [{ name: 'أسود', images: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600'] }],
      },
      {
        name: 'نظارة شمسية أفياتور',
        code: 'SUN-002',
        category: sun._id,
        price: 320,
        cost: 190,
        size: 'Large',
        colors: [{ name: 'ذهبي', images: ['https://images.unsplash.com/photo-1577803645773-f96470509666?w=600'] }],
      },
      {
        name: 'إطار طبي رفيع',
        code: 'OPT-001',
        category: optical._id,
        price: 180,
        cost: 90,
        size: 'Medium',
        colors: [{ name: 'فضي', images: ['https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=600'] }],
      },
      {
        name: 'إطار طبي عصري',
        code: 'OPT-002',
        category: optical._id,
        price: 220,
        cost: 120,
        size: 'Small',
        colors: [{ name: 'أسود', images: ['https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=600'] }],
      },
    ]);

    // One active offer so the offers section renders out of the box.
    const now = new Date();
    await Offer.create({
      title: 'خصم الافتتاح',
      type: 'products',
      products: [created[0]._id, created[1]._id],
      discountType: 'percentage',
      discountValue: 25,
      startDate: new Date(now.getTime() - 86400000),
      endDate: new Date(now.getTime() + 30 * 86400000),
      isActive: true,
    });

    console.log('Seeded sample categories, products, and an active offer.');
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
