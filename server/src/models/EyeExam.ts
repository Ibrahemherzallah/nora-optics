import { Schema, model, Document, Types } from 'mongoose';

interface EyeSide {
  sph?: string;
  cyl?: string;
  axis?: string;
  add?: string;
  va?: string;
}

export interface EyeExamDoc extends Document {
  customer?: Types.ObjectId;
  saleFile?: Types.ObjectId;
  name?: string;
  age?: number;
  address?: string;
  phone?: string;
  right: EyeSide;
  left: EyeSide;
  ipd?: string;
  source: 'external' | 'internal' | 'old';
  doctorName?: string;
}

const sideSchema = new Schema<EyeSide>(
  { sph: String, cyl: String, axis: String, add: String, va: String },
  { _id: false }
);

const eyeExamSchema = new Schema<EyeExamDoc>(
  {
    customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
    saleFile: { type: Schema.Types.ObjectId, ref: 'SaleFile' },
    name: { type: String },
    age: { type: Number, min: 0 },
    address: { type: String },
    phone: { type: String, match: /^\d{10}$/ },
    right: { type: sideSchema, default: {} },
    left: { type: sideSchema, default: {} },
    ipd: { type: String },
    source: { type: String, enum: ['external', 'internal', 'old'], required: true },
    doctorName: { type: String },
  },
  { timestamps: true }
);

export const EyeExam = model<EyeExamDoc>('EyeExam', eyeExamSchema);
