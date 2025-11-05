import mongoose, { Schema, Document } from "mongoose";

export interface ISubscriber extends Document {
  email: string;
  status: string; // "Active" | "Unsubscribed"
  joined: Date;
}

const SubscriberSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    status: { type: String, default: "Active" },
    joined: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.models.Subscriber || mongoose.model<ISubscriber>("Subscriber", SubscriberSchema);
