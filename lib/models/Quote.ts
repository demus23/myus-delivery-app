import mongoose, { Schema, models, model } from "mongoose";

const OptionSchema = new Schema(
  {
    carrier: String,
    service: String, // 'standard' | 'express'
    etaDays: Number,
    priceAED: Number,
    breakdown: {
      baseAED: Number,
      fuelAED: Number,
      remoteAED: Number,
      insuranceAED: Number,
    },
  },
  { _id: false }
);

const QuoteSchema = new Schema({
  userId: { type: String, default: null },
  from: { type: Schema.Types.Mixed, required: true },
  to: { type: Schema.Types.Mixed, required: true },
  weightKg: { type: Number, required: true },
  dims: { type: Schema.Types.Mixed, default: {} },
  speed: { type: String, required: true }, // requested speed
  options: { type: [OptionSchema], default: [] },
  cheapestIndex: { type: Number, default: 0 },
  chosenIndex: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
});

export type QuoteDoc = mongoose.InferSchemaType<typeof QuoteSchema>;
export default (models.Quote as mongoose.Model<QuoteDoc>) ||
  model<QuoteDoc>("Quote", QuoteSchema);
