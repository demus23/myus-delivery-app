// lib/models/Shipment.ts
import mongoose, { Schema, Types } from "mongoose";

export type ShipmentStatus =
  | "draft"
  | "rated"
  | "label_purchased"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "return_to_sender"
  | "exception"
  | "cancelled";

export interface IShipment {
  _id: Types.ObjectId;
  orderId?: string;
  currency: string;

  to: {
    name?: string;
    line1: string; line2?: string;
    city: string; postalCode?: string; country: string;
    phone?: string; email?: string;
  };
  from: {
    name?: string;
    line1: string; line2?: string;
    city: string; postalCode?: string; country: string;
    phone?: string; email?: string;
  };

  parcel: { length: number; width: number; height: number; weight: number };

  providerShipmentId?: string;         // carrier's shipment id (EP/Shippo/mock)
  selectedRateId?: string;             // chosen rate object id (carrier side)
  carrier?: string;
  service?: string;
  trackingNumber?: string;
  labelUrl?: string;

  customerEmail?: string | null;

  status: ShipmentStatus;

  ratesSnapshot?: any[];
  activity?: Array<{ at: Date; type: string; payload?: any }>;

  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema = new Schema<IShipment>(
  {
    orderId: { type: String, index: true },

    currency: { type: String, required: true, uppercase: true },

    to: {
      name: String,
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      postalCode: String,
      country: { type: String, required: true },
      phone: String,
      email: String,
    },

    from: {
      name: String,
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true },
      postalCode: String,
      country: { type: String, required: true },
      phone: String,
      email: String,
    },

    parcel: {
      length: { type: Number, required: true, min: 0 },
      width:  { type: Number, required: true, min: 0 },
      height: { type: Number, required: true, min: 0 },
      weight: { type: Number, required: true, min: 0 },
    },

    // NOTE: removed field-level index to avoid duplicate with schema.index below
    providerShipmentId: { type: String },

    selectedRateId: { type: String },
    carrier:        { type: String },
    service:        { type: String },

    // Keep trackingNumber indexed; sparse allows docs without it
    trackingNumber: { type: String, index: true, sparse: true },

    labelUrl: { type: String },

    customerEmail: { type: String, index: true, sparse: true },

    status: {
      type: String,
      enum: [
        "draft",
        "rated",
        "label_purchased",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "return_to_sender",
        "exception",
        "cancelled",
      ],
      default: "draft",
      // (Optional) Remove single-field index if you keep compound below
      // index: true,
    },

    ratesSnapshot: { type: Array },
    activity: [
      {
        at: { type: Date, default: Date.now },
        type: { type: String, required: true },
        payload: Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

// Helpful indexes (keep these; remove duplicates elsewhere)
ShipmentSchema.index({ status: 1, createdAt: -1 });
ShipmentSchema.index({ providerShipmentId: 1 }, { sparse: true });

export const Shipment =
  (mongoose.models.Shipment as mongoose.Model<IShipment>) ||
  mongoose.model<IShipment>("Shipment", ShipmentSchema);
