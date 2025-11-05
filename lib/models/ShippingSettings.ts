// lib/models/ShippingSettings.ts
import mongoose, { Schema, InferSchemaType, model, models } from "mongoose";

const CarrierSchema = new Schema(
  {
    name: { type: String, required: true }, // "DHL" | "Aramex" | "UPS" | custom
    enabled: { type: Boolean, default: true },

    // pricing knobs
    divisor: { type: Number, default: 5000 }, // volumetric divisor (cm)
    basePerKgStd: { type: Number, default: 30 }, // AED/kg (standard)
    basePerKgExp: { type: Number, default: 50 }, // AED/kg (express)
    minStdAED: { type: Number, default: 60 },
    minExpAED: { type: Number, default: 90 },
    fuelPct: { type: Number, default: 18 }, // %
    markupPct: { type: Number, default: 12 }, // %
    remoteSurchargeAED: { type: Number, default: 30 },

    // list of prefixes/country codes/regions you treat as “remote”
    remotePrefixes: { type: [String], default: [] },
  },
  { _id: false }
);

const ShippingSettingsSchema = new Schema(
  {
    forbidden: { type: String, default: "" }, // CSV e.g. "IR,SY,KP"
    carriers: { type: [CarrierSchema], default: [] },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "shipping_settings" }
);

// Reuse model in dev to avoid OverwriteModelErrors
export type CarrierSettings = InferSchemaType<typeof CarrierSchema>;
export type ShippingSettingsDoc = InferSchemaType<typeof ShippingSettingsSchema>;

export default (models.ShippingSettings as mongoose.Model<ShippingSettingsDoc>) ||
  model<ShippingSettingsDoc>("ShippingSettings", ShippingSettingsSchema);
