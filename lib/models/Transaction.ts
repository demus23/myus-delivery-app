import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true }, // major units, e.g., 49 (not 4900)
    currency: { type: String, default: "AED" },
    status: { type: String, enum: ["pending", "succeeded", "failed", "refunded"], default: "pending" },
    description: { type: String },

    method: {
      type: {
        type: String, // e.g., "card", "link"
      },
      brand: String,
      last4: String,
    },

    processor: {
      name: String, // "stripe"
      checkoutSessionId: String,
      paymentIntentId: String,
      chargeId: String,
    },

    invoiceNumber: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
