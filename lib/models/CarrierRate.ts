// lib/models/CarrierRate.ts
import mongoose, { Schema, models, model } from "mongoose";

const SpeedCfgSchema = new Schema(
  {
    basePerKgAED: { type: Number, required: true, default: 0 },
    minChargeAED: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const CarrierRateSchema = new Schema({
  name: { type: String, required: true, unique: true }, // 'DHL' | 'Aramex' | 'UPS'
  enabled: { type: Boolean, default: true },
  standard: { type: SpeedCfgSchema, required: true },
  express: { type: SpeedCfgSchema, required: true },
  fuelPercent: { type: Number, default: 0 },            // percent of base
  remoteSurchargeAED: { type: Number, default: 0 },     // flat add-on
  remoteAreaPostcodePrefixes: { type: [String], default: [] }, // optional per-carrier
  updatedAt: { type: Date, default: Date.now },
});

// Infer the TS type from the schema
export type CarrierRateDoc = mongoose.InferSchemaType<typeof CarrierRateSchema>;

// Type the hook `this` as a hydrated document so assignment is safe
CarrierRateSchema.pre<mongoose.HydratedDocument<CarrierRateDoc>>("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default (models.CarrierRate as mongoose.Model<CarrierRateDoc>) ||
  model<CarrierRateDoc>("CarrierRate", CarrierRateSchema);
