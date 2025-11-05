import mongoose, { Schema, InferSchemaType, model, models } from "mongoose";

const trackingEventSchema = new Schema(
  {
    packageId: { type: Schema.Types.ObjectId, ref: "Package", index: true, required: true },
    trackingNo: { type: String, index: true, required: true },
    status: {
      type: String,
      enum: [
        "CREATED","RECEIVED","IN_WAREHOUSE","CONSOLIDATED","IN_TRANSIT",
        "CUSTOMS","OUT_FOR_DELIVERY","DELIVERED","ON_HOLD","CANCELLED",
        // also support your existing statuses:
        "Pending","Shipped","Delivered","Canceled","Forwarded"
      ],
      required: true,
      default: "IN_WAREHOUSE",
    },
    location: { type: String, default: "" },
    note: { type: String, default: "" },
    actorId: { type: String, default: "" },
    actorName: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

trackingEventSchema.index({ trackingNo: 1, createdAt: -1 });

export type TrackingEvent = InferSchemaType<typeof trackingEventSchema>;
export default models.TrackingEvent || model("TrackingEvent", trackingEventSchema);
