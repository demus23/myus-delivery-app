import mongoose, { Schema, models, model } from "mongoose";

const FxRateSchema = new Schema({
  base: { type: String, required: true, default: "AED" },
  rates: { type: Schema.Types.Mixed, required: true, default: {} }, // e.g. { USD: 0.2723, GBP: 0.2139 }
  fetchedAt: { type: Date, default: Date.now },
});

export type FxRateDoc = mongoose.InferSchemaType<typeof FxRateSchema>;
export default (models.FxRate as mongoose.Model<FxRateDoc>) ||
  model<FxRateDoc>("FxRate", FxRateSchema);
