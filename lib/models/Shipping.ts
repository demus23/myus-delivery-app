import mongoose from "mongoose";
const ShippingSchema = new mongoose.Schema({
  package: { type: mongoose.Schema.Types.ObjectId, ref: "Package", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
  status: { type: String, enum: ["Pending", "In Transit", "Delivered", "Problem"], default: "Pending" },
  shippedAt: Date,
  deliveredAt: Date,
  notes: String,
  invoiceNo: { type: String, index: true },
}, { timestamps: true });

export default mongoose.models.Shipping || mongoose.model("Shipping", ShippingSchema);
