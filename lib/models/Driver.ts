import mongoose, { Schema, Document } from "mongoose";

export interface IDriver extends Document {
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Driver ||
  mongoose.model<IDriver>("Driver", DriverSchema);
