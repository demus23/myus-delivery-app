// lib/models/Log.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ILog extends Document {
  user: string;
  action: string;
  entity?: string;
  detail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LogSchema: Schema = new Schema(
  {
    user: { type: String, required: true },
    action: { type: String, required: true },
    entity: { type: String },
    detail: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Log || mongoose.model<ILog>("Log", LogSchema);
