import { Schema, model, Document, Types } from 'mongoose';

export interface OfferDoc extends Document {
  title: string;
  type: 'category' | 'products' | 'product';
  category?: Types.ObjectId;
  products?: Types.ObjectId[];
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

const offerSchema = new Schema<OfferDoc>(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['category', 'products', 'product'], required: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Offer = model<OfferDoc>('Offer', offerSchema);
