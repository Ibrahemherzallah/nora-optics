import { Schema, model, Document } from 'mongoose';

// --- AdminUser ---
export interface AdminUserDoc extends Document {
  username: string;
  passwordHash: string;
  role: 'admin';
}
const adminSchema = new Schema<AdminUserDoc>(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin'], default: 'admin' },
  },
  { timestamps: true }
);
export const AdminUser = model<AdminUserDoc>('AdminUser', adminSchema);

// --- Settings (singleton: contact info / store config) ---
export interface SettingsDoc extends Document {
  key: string;
  storeName: string;
  address?: string;
  phones: string[];
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  mapEmbedUrl?: string;
  workingHours?: string;
}
const settingsSchema = new Schema<SettingsDoc>(
  {
    key: { type: String, default: 'contact', unique: true },
    storeName: { type: String, default: 'مركز نورا للبصريات' },
    address: String,
    phones: { type: [String], default: [] },
    whatsapp: String,
    instagram: String,
    facebook: String,
    mapEmbedUrl: String,
    workingHours: String,
  },
  { timestamps: true }
);
export const Settings = model<SettingsDoc>('Settings', settingsSchema);

// --- Counter (atomic sequence generator — review #4) ---
// Not extending Document so we can use a custom string _id.
export interface CounterDoc {
  _id: string;
  seq: number;
}
const counterSchema = new Schema<CounterDoc>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
export const Counter = model<CounterDoc>('Counter', counterSchema);

// Atomic increment. Returns the next value. Optional session for transactions.
export async function nextSequence(name: string, session?: any): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return doc!.seq;
}
