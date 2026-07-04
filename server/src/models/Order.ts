import { Schema, model, Document, Types } from 'mongoose';

export const DELIVERY_FEES = { westbank: 20, jerusalem: 30, inside48: 70 } as const;
export type DeliveryZone = keyof typeof DELIVERY_FEES;

export interface OrderItem {
  product: Types.ObjectId;
  nameSnap: string;
  imageSnap?: string;
  codeSnap: string;
  color?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderDoc extends Document {
  customer?: Types.ObjectId;
  customerName: string;
  phone: string;
  address?: string;
  age?: number;
  sex?: string;
  items: OrderItem[];
  deliveryZone: DeliveryZone;
  deliveryFee: number;
  subtotal: number;
  total: number;
  status: 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';
  saleFile: Types.ObjectId;
  orderNumber: string;
}

const itemSchema = new Schema<OrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    nameSnap: { type: String, required: true },
    imageSnap: { type: String },
    codeSnap: { type: String, required: true },
    color: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema<OrderDoc>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true },
    phone: { type: String, required: true, match: /^\d{10}$/ },
    address: { type: String },
    age: { type: Number, min: 0 },
    sex: { type: String },
    items: { type: [itemSchema], required: true },
    deliveryZone: { type: String, enum: ['westbank', 'jerusalem', 'inside48'], required: true },
    deliveryFee: { type: Number, required: true },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
      index: true,
    },
    saleFile: { type: Schema.Types.ObjectId, ref: 'SaleFile' },
    orderNumber: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });

export const Order = model<OrderDoc>('Order', orderSchema);
