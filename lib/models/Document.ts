import mongoose, { Schema, Model, models } from "mongoose";

export interface IDocument {
  userId: string;
  userEmail?: string;
  suiteId?: string;
  originalName: string;
  filename: string;        // stored on disk
  mimeType?: string;
  size?: number;
  url: string;              // /uploads/xyz.pdf
  status: "pending" | "approved" | "rejected";
  notes?: string;
}

const DocumentSchema = new Schema<IDocument>(
  {
    userId: { type: String, required: true },
    userEmail: String,
    suiteId: String,
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: String,
    size: Number,
    url: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    notes: String,
  },
  { timestamps: true }
);

export default (models.Document as Model<IDocument>) ||
  mongoose.model<IDocument>("Document", DocumentSchema);
