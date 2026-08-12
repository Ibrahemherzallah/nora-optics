import { Schema, model, Document, Types } from 'mongoose';

interface EyeSide {
    sph?: string; cyl?: string; axis?: string; add?: string; va?: string;
}

export interface EyeExamRecord {
    _id: Types.ObjectId;
    right: EyeSide;
    left: EyeSide;
    ipd?: string;
    source: 'external' | 'internal' | 'old';
    doctorName?: string;
    date: Date;
    note?: string;
    createdAt: Date;
}

export interface EyeExamDoc extends Document {
    customer: Types.ObjectId;        // now required — every exam belongs to a customer
    saleFile?: Types.ObjectId;
    records: EyeExamRecord[];
}

const sideSchema = new Schema<EyeSide>(
    { sph: String, cyl: String, axis: String, add: String, va: String },
    { _id: false }
);

const recordSchema = new Schema<EyeExamRecord>(
    {
        right: { type: sideSchema, default: {} },
        left: { type: sideSchema, default: {} },
        ipd: { type: String },
        source: { type: String, enum: ['external', 'internal', 'old'], required: true },
        doctorName: { type: String },
        date: { type: Date, default: Date.now },
        note: { type: String },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const eyeExamSchema = new Schema<EyeExamDoc>(
    {
        customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
        saleFile: { type: Schema.Types.ObjectId, ref: 'SaleFile' },
        records: { type: [recordSchema], default: [] },
    },
    { timestamps: true }
);

export const EyeExam = model<EyeExamDoc>('EyeExam', eyeExamSchema);