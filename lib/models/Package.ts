// /lib/models/Package.ts
import { Schema, model, models, Document, Types } from "mongoose";

export type PackageStatus =
  | "Pending"
  | "Received"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Forwarded"
  | "In Transit";

export interface IPackage extends Document {
  title: string;                 // matches admin API
  user: Types.ObjectId;          // matches admin API (User _id)
  tracking?: string;
  courier?: string;
  value?: number;
  userEmail?: string;
  suiteId?: string;              // unique + sparse
  status: PackageStatus;
  lastLocation?: string;
  lastNote?: string;
  adminCreatedBy?: string;       // matches admin API
  createdAt?: Date;
  updatedAt?: Date;
}

const PackageSchema = new Schema<IPackage>(
  {
    title: { type: String, required: true, trim: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    tracking: { type: String, trim: true, index: true },
    courier: { type: String, trim: true },
    value: { type: Number, default: 0 },

    userEmail: { type: String, trim: true },

    // IMPORTANT: unique + sparse; keep field missing unless set
    suiteId: {
      type: String,
      trim: true,
      default: undefined,
      index: true,  
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Received",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Forwarded",
        "In Transit",
      ],
      default: "Pending",
      index: true,
    },

    lastLocation: { type: String, trim: true },
    lastNote: { type: String, trim: true },

    adminCreatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

/** Normalize update payloads (prevent empty suiteId, normalize status). */
function normalizeUpdateObject(update: any) {
  if (!update) return;

  const scrubSuiteId = (obj: any) => {
    if (!obj || typeof obj !== "object") return;
    if ("suiteId" in obj) {
      const s = obj.suiteId;
      if (s === null || (typeof s === "string" && s.trim() === "")) {
        obj.$unset = { ...(obj.$unset || {}), suiteId: "" };
        delete obj.suiteId;
      } else if (typeof s === "string") {
        obj.suiteId = s.trim();
      }
    }
  };

  scrubSuiteId(update);
  if (update.$set) scrubSuiteId(update.$set);

  // Accept "Canceled" but store "Cancelled"
  const fixStatus = (v: any) =>
    typeof v === "string" && v.toLowerCase() === "canceled" ? "Cancelled" : v;

  if ("status" in update) update.status = fixStatus(update.status);
  if (update.$set && "status" in update.$set) {
    update.$set.status = fixStatus(update.$set.status);
  }
}

PackageSchema.pre("save", function (next) {
  if (this.suiteId === "" || this.suiteId === null) {
    // @ts-ignore – make field missing so sparse index ignores it
    this.suiteId = undefined;
  }
  if ((this.status as any) === "Canceled") {
    this.status = "Cancelled";
  }
  next();
});
PackageSchema.pre("findOneAndUpdate", function (next) {
  // getUpdate() can be null; default to {}
  const update = (this.getUpdate() ?? {}) as Record<string, any>;
  normalizeUpdateObject(update);
  this.setUpdate(update as any);
  next();
});


PackageSchema.pre("updateOne", function (next) {
  const update = (this.getUpdate() ?? {}) as Record<string, any>;
  normalizeUpdateObject(update);
  this.setUpdate(update as any);
  next();
});

// Avoid model recompilation in Next.js dev
const PackageModel = models.Package || model<IPackage>("Package", PackageSchema);
export default PackageModel;
