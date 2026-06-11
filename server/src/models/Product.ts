import { Schema, model, Document, Types } from 'mongoose';

export interface ProductColor {
  name: string;
  images: string[];
}

export interface ProductDoc extends Document {
  name: string;
  code: string;
  category: Types.ObjectId;
  price: number;
  cost: number; // ADMIN ONLY — stripped by public serializer
  size?: string;
  colors: ProductColor[];
  isSoldOut: boolean;
  isInOffer: boolean; // display hint only — never authoritative for pricing
  isDeleted: boolean;
}

const colorSchema = new Schema<ProductColor>(
  {
    name: { type: String, required: true },
    images: { type: [String], default: [] },
  },
  { _id: false }
);

const productSchema = new Schema<ProductDoc>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, index: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0 },
    size: { type: String },
    colors: {
      type: [colorSchema],
      validate: { validator: (v: ProductColor[]) => v.length >= 1, message: 'At least one color is required' },
    },
    isSoldOut: { type: Boolean, default: false },
    isInOffer: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

productSchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().withDeleted) this.where({ isDeleted: false });
});

export const Product = model<ProductDoc>('Product', productSchema);
