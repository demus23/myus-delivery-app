import mongoose, { Schema, models, model } from "mongoose";

export type Speed = "standard" | "express";
export type Carrier = "DHL" | "Aramex" | "UPS";

export interface ShippingRateDoc extends mongoose.Document {
  lane: string;                 // e.g. "UAE-UK"
  carrier: Carrier;
  speed: Speed;
  minChargeKg: number;
  incrementStepKg: number;
  base: number;
  perKgAfterMin: number;
  fuelPct: number;              // 0.18 = 18%
  remoteFee: number;            // flat AED
  insurancePct: number;         // 0.005 = 0.5%
  insuranceMin: number;         // AED
  createdAt: Date;
  updatedAt: Date;
}

const ShippingRateSchema = new Schema<ShippingRateDoc>(
  {
    lane: { type: String, required: true, index: true },
    carrier: { type: String, required: true, enum: ["DHL", "Aramex", "UPS"], index: true },
    speed: { type: String, required: true, enum: ["standard", "express"], index: true },

    minChargeKg: { type: Number, required: true },
    incrementStepKg: { type: Number, required: true },
    base: { type: Number, required: true },
    perKgAfterMin: { type: Number, required: true },
    fuelPct: { type: Number, required: true },
    remoteFee: { type: Number, required: true },
    insurancePct: { type: Number, required: true },
    insuranceMin: { type: Number, required: true },
  },
  { timestamps: true }
);

ShippingRateSchema.index({ lane: 1, carrier: 1, speed: 1 }, { unique: true });

export default models.ShippingRate ||
  model<ShippingRateDoc>("ShippingRate", ShippingRateSchema);
