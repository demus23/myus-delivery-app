import mongoose from "mongoose";
const InvoiceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  number: { type: String, required: true, unique: true },
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
  }],
  total: { type: Number, required: true },
  status: { type: String, enum: ["Paid", "Unpaid"], default: "Unpaid" },
  dueDate: Date,
  notes: String,
}, { timestamps: true });

export default mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
