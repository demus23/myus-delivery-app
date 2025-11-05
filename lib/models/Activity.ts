import mongoose, { Schema, Types } from "mongoose";

export interface IActivity {
  action: string;              // e.g. "charge.created", "charge.status_changed"
  entity: string;              // e.g. "payment", "package", "user"
  entityId?: string;
  performedBy?: Types.ObjectId;
  performedByEmail?: string;
  details?: any;
  ip?: string;
  ua?: string;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>({
  action: { type: String, required: true, index: true },
  entity: { type: String, required: true, index: true },
  entityId: { type: String },
  performedBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
  performedByEmail: { type: String, index: true },
  details: Schema.Types.Mixed,
  ip: String,
  ua: String,
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

export const Activity =
  (mongoose.models.Activity as mongoose.Model<IActivity>) ||
  mongoose.model<IActivity>("Activity", ActivitySchema);
