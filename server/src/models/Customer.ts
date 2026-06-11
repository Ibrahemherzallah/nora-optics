import { Schema, model, Document } from 'mongoose';

export interface CustomerDoc extends Document {
  name: string;
  phone: string;
  address?: string;
  age?: number;
  sex?: 'male' | 'female';
  source: 'store' | 'online';
}

const customerSchema = new Schema<CustomerDoc>(
  {
    name: { type: String, required: true, trim: true },
    // unique index is what makes the upsert-based dedup race-safe (review #4)
    phone: { type: String, required: true, unique: true, index: true, match: /^\d{10}$/ },
    address: { type: String },
    age: { type: Number, min: 0 },
    sex: { type: String, enum: ['male', 'female'] },
    source: { type: String, enum: ['store', 'online'], required: true },
  },
  { timestamps: true }
);

export const Customer = model<CustomerDoc>('Customer', customerSchema);
