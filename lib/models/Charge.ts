// lib/models/Charge.ts
import mongoose, { Schema, Model, models } from "mongoose";

export type ChargeStatus =
  | "requires_payment_method"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded"
  | "partial_refund";

export interface ICharge {
  _id?: mongoose.Types.ObjectId;
  userId?: string; // internal user _id as string (if known)
  email?: string; // customer email (from session)
  invoiceNo?: string; // your invoice number
  amount: number; // decimal value in major currency (e.g., 49.99)
  currency: string; // e.g., "aed"
  status: ChargeStatus;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeSessionId?: string;
  metadata?: Record<string, any>;
  refunds?: {
    amount: number; // decimal
    reason?: string;
    createdAt?: Date;
    stripeRefundId?: string;
  }[];
  raw?: any; // optional snapshot of last Stripe object for debugging
  createdAt?: Date;
  updatedAt?: Date;
}

const ChargeSchema = new Schema<ICharge>(
  {
    userId: { type: String, index: true },
    email: { type: String, index: true },
    invoiceNo: { type: String, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "aed" },
    status: {
      type: String,
      enum: [
        "requires_payment_method",
        "processing",
        "succeeded",
        "failed",
        "refunded",
        "partial_refund",
      ],
      default: "processing",
      index: true,
    },
    stripePaymentIntentId: { type: String, unique: true, sparse: true },
    stripeChargeId: { type: String, unique: true, sparse: true },
    stripeSessionId: { type: String, unique: true, sparse: true },
    metadata: { type: Schema.Types.Mixed },
    refunds: [
      {
        amount: Number,
        reason: String,
        createdAt: Date,
        stripeRefundId: String,
      },
    ],
    raw: Schema.Types.Mixed,
  },
  { timestamps: true }
);

ChargeSchema.index({ invoiceNo: 1, userId: 1 });

export const Charge: Model<ICharge> =
  (models.Charge as Model<ICharge>) ||
  mongoose.model<ICharge>("Charge", ChargeSchema);
