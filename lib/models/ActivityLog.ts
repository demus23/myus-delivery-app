import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IActivityLog extends Document {
  action: string;            // e.g. 'add_user', 'delete_package'
  entity: string;            // e.g. 'user', 'package'
  entityId?: string;         // Mongo ID of user/package (optional)
  performedBy: string;       // admin email or name
  details?: any;             // extra info (object/string)
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String },
  performedBy: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});
// good defaults for admin feed queries
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
ActivityLogSchema.index({ performedById: 1, createdAt: -1 }); // if you store it

export default models.ActivityLog || model<IActivityLog>("ActivityLog", ActivityLogSchema);
