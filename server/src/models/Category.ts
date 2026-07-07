import { Schema, model, Document } from 'mongoose';

export interface CategoryDoc extends Document {
  name: string;
  description?: string;
  image: string;
  isDeleted: boolean;
}

const categorySchema = new Schema<CategoryDoc>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String },
    image: { type: String, required: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Auto-exclude soft-deleted docs from all find queries.
// Pass { withDeleted: true } in query options to bypass (admin restore views).
categorySchema.pre(/^find/, function (this: any) {
  if (!this.getOptions().withDeleted) this.where({ isDeleted: false });
});

export const Category = model<CategoryDoc>('Category', categorySchema);
