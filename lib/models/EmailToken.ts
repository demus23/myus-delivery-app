// lib/models/EmailToken.ts
import mongoose, { Schema, Document, models } from "mongoose";

export type TokenType = "verify" | "reset";

export interface IEmailToken extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  token: string;
  type: TokenType;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTokenSchema = new Schema<IEmailToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["verify", "reset"],
      required: true,
      index: true,
    },
    // 👇 remove "index: true" here
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// keep TTL index ✅
EmailTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.EmailToken ||
  mongoose.model<IEmailToken>("EmailToken", EmailTokenSchema);
