import { Schema, model, Document, Types } from 'mongoose';

export interface SaleRecord {
  product: Types.ObjectId;
  productNameSnap: string;
  productCodeSnap: string;
  productImageSnap?: string;
  originalPrice: number;
  cost: number;
  priceType: 'original' | 'custom';
  customPrice?: number;
  quantity: number; // review #2 — needed for correct online-order profit
  hasAccessories: boolean;
  accessoriesDesc?: string;
  accessoriesCost?: number;
  sellingPrice: number; // unit selling price = customPrice ?? originalPrice
  profit: number; // (sellingPrice - cost) * quantity - (accessoriesCost || 0)
  notes?: string;
  date: Date;
  createdAt: Date;
}

export interface SaleFileDoc extends Document {
  customer?: Types.ObjectId;   // optional now (walk-in has none)
  walkIn: boolean;             // NEW: shop walk-in, no customer file
  notes?: string;              // NEW
  records: SaleRecord[];
  eyeExam?: Types.ObjectId;
  origin: 'admin' | 'online';
  order?: Types.ObjectId;
  isVoided: boolean; // set true when linked order is cancelled (review #3)
  totalSelling: number;
  totalProfit: number;
}

const recordSchema = new Schema<SaleRecord>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    productNameSnap: { type: String, required: true },
    productCodeSnap: { type: String, required: true },
    productImageSnap: { type: String },
    originalPrice: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    priceType: { type: String, enum: ['original', 'custom'], required: true },
    customPrice: { type: Number, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    hasAccessories: { type: Boolean, default: false },
    accessoriesDesc: { type: String },
    accessoriesCost: { type: Number, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    profit: { type: Number, required: true },
    notes: { type: String },        // NEW
    date: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const saleFileSchema = new Schema<SaleFileDoc>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', index: true }, // removed required:true
    walkIn: { type: Boolean, default: false },
    notes: { type: String },
    records: { type: [recordSchema], default: [] },
    eyeExam: { type: Schema.Types.ObjectId, ref: 'EyeExam' },
    origin: { type: String, enum: ['admin', 'online'], required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    isVoided: { type: Boolean, default: false, index: true },
    totalSelling: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Single source of truth for record + totals math. Call before saving.
export function computeRecord(input: {
  originalPrice: number;
  cost: number;
  priceType: 'original' | 'custom';
  customPrice?: number;
  quantity?: number;
  accessoriesCost?: number;
}) {
  const quantity = input.quantity ?? 1;
  const sellingPrice = input.priceType === 'custom' ? Number(input.customPrice) : input.originalPrice;
  const accessoriesCost = input.accessoriesCost || 0;
  const profit = (sellingPrice - input.cost) * quantity - accessoriesCost;
  return { sellingPrice, profit, quantity };
}

saleFileSchema.pre('save', function (next) {
  this.totalSelling = this.records.reduce((s, r) => s + r.sellingPrice * (r.quantity || 1), 0);
  this.totalProfit = this.records.reduce((s, r) => s + r.profit, 0);
  next();
});

export const SaleFile = model<SaleFileDoc>('SaleFile', saleFileSchema);
