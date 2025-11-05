import mongoose, { Schema, Document } from "mongoose";

export interface IPromotion extends Document {
  title: string;
  status: string; // "Active" | "Expired" | etc.
  endDate: Date;
}

const PromotionSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    status: { type: String, default: "Active" },
    endDate: { type: Date, required: true }
  },
  { timestamps: true }
);

export default mongoose.models.Promotion || mongoose.model<IPromotion>("Promotion", PromotionSchema);
