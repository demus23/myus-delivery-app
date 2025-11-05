import mongoose, { Schema, Document } from "mongoose";

export interface IStore extends Document {
  name: string;
  address: string;
  phone?: string;
  email?: string;
}

const StoreSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Store || mongoose.model<IStore>("Store", StoreSchema);
