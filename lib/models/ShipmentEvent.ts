// lib/models/ShipmentEvent.ts
import mongoose, { Schema, Types } from "mongoose";

export type ShipmentEventStatus =
  | "created"
  | "received_at_warehouse"
  | "in_transit"
  | "customs"
  | "out_for_delivery"
  | "delivered"
  | "exception";

export interface IShipmentEvent {
  shipment?: Types.ObjectId;           // optional reference to your Shipping doc
  tracking: string;                    // tracking number (index)
  status: ShipmentEventStatus;         // normalized status
  location?: string;                   // e.g., "Dubai Hub"
  note?: string;                       // free text
  performedBy?: Types.ObjectId;        // admin user (optional)
  performedByEmail?: string;           // convenience
  createdAt: Date;
}

const ShipmentEventSchema = new Schema<IShipmentEvent>(
  {
    shipment: { type: Schema.Types.ObjectId, ref: "Shipping" },
    tracking: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: [
        "created",
        "received_at_warehouse",
        "in_transit",
        "customs",
        "out_for_delivery",
        "delivered",
        "exception",
      ],
      required: true,
      index: true,
    },
    location: String,
    note: String,
    performedBy: { type: Schema.Types.ObjectId, ref: "User" },
    performedByEmail: String,
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

ShipmentEventSchema.index({ tracking: 1, createdAt: -1 });

export const ShipmentEvent =
  (mongoose.models.ShipmentEvent as mongoose.Model<IShipmentEvent>) ||
  mongoose.model<IShipmentEvent>("ShipmentEvent", ShipmentEventSchema);
